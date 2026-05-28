using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace Executor.Services
{
    public class FileSystemEntry
    {
        public string Name { get; set; }
        public string Path { get; set; }
        public bool IsDirectory { get; set; }
        public long Size { get; set; }
        public string LastModified { get; set; }
    }

    public class FileSystemService : IDisposable
    {
        private string _workspacePath;
        private FileSystemWatcher _watcher;
        private bool _disposed;
        private readonly object _lock = new object();

        public event Action<string, List<FileSystemEntry>> DirectoryChanged;
        public event Action<string> FileExternallyChanged;

        public string WorkspacePath => _workspacePath;

        public bool Initialize()
        {
            _workspacePath = GetWorkspacePath();
            Directory.CreateDirectory(_workspacePath);

            CreateSampleFiles();
            StartWatcher();
            return true;
        }

        private string GetWorkspacePath()
        {
            string docs = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
            return Path.Combine(docs, "CodeForge");
        }

        private void CreateSampleFiles()
        {
            if (Directory.GetFiles(_workspacePath).Length > 0 || Directory.GetDirectories(_workspacePath).Length > 0)
                return;

            string sampleDir = Path.Combine(_workspacePath, "examples");
            Directory.CreateDirectory(sampleDir);

            File.WriteAllText(Path.Combine(_workspacePath, "main.lua"), @"-- Welcome to CodeForge
-- Start coding here

local function greet(name)
  print(""Hello, "" .. name .. ""!"")
end

greet(""World"")
");

            File.WriteAllText(Path.Combine(sampleDir, "utils.lua"), @"-- Utility functions

local Utils = {}

function Utils.clamp(val, min, max)
  return math.max(min, math.min(max, val))
end

return Utils
");

            File.WriteAllText(Path.Combine(sampleDir, "config.lua"), @"-- Configuration
return {
  debug = false,
  version = ""1.0.0"",
}
");
        }

        private void StartWatcher()
        {
            _watcher = new FileSystemWatcher(_workspacePath)
            {
                IncludeSubdirectories = true,
                EnableRaisingEvents = true,
                NotifyFilter = NotifyFilters.FileName | NotifyFilters.DirectoryName | NotifyFilters.LastWrite
            };

            _watcher.Changed += OnWatcherChanged;
            _watcher.Created += OnWatcherCreated;
            _watcher.Deleted += OnWatcherEvent;
            _watcher.Renamed += OnWatcherRenamed;
        }

        private void OnWatcherChanged(object sender, FileSystemEventArgs e)
        {
            if (_disposed) return;
            if (IsTempFile(e.Name)) return;
            System.Threading.Thread.Sleep(30);
            var relative = GetRelativePath(e.FullPath);
            FileExternallyChanged?.Invoke(relative);
            PushDirectory();
        }

        private void OnWatcherCreated(object sender, FileSystemEventArgs e)
        {
            if (_disposed) return;
            if (IsTempFile(e.Name)) return;
            System.Threading.Thread.Sleep(30);
            PushDirectory();
            var relative = GetRelativePath(e.FullPath);
            if (!Directory.Exists(e.FullPath))
                FileExternallyChanged?.Invoke(relative);
        }

        private void OnWatcherEvent(object sender, FileSystemEventArgs e)
        {
            if (_disposed) return;
            if (IsTempFile(e.Name)) return;
            System.Threading.Thread.Sleep(30);
            PushDirectory();
        }

        private void OnWatcherRenamed(object sender, RenamedEventArgs e)
        {
            if (_disposed) return;
            System.Threading.Thread.Sleep(30);
            PushDirectory();
        }

        private bool IsTempFile(string name)
        {
            return name != null && (name.EndsWith("~") || name.EndsWith(".tmp"));
        }

        public List<FileSystemEntry> ListAll()
        {
            var entries = new List<FileSystemEntry>();

            try
            {
                foreach (string dir in Directory.GetDirectories(_workspacePath, "*", SearchOption.AllDirectories))
                {
                    var info = new DirectoryInfo(dir);
                    entries.Add(new FileSystemEntry
                    {
                        Name = info.Name,
                        Path = GetRelativePath(info.FullName),
                        IsDirectory = true,
                        LastModified = info.LastWriteTime.ToString("o")
                    });
                }

                foreach (string file in Directory.GetFiles(_workspacePath, "*", SearchOption.AllDirectories))
                {
                    var info = new FileInfo(file);
                    if (IsTempFile(info.Name)) continue;
                    entries.Add(new FileSystemEntry
                    {
                        Name = info.Name,
                        Path = GetRelativePath(info.FullName),
                        IsDirectory = false,
                        Size = info.Length,
                        LastModified = info.LastWriteTime.ToString("o")
                    });
                }
            }
            catch { }

            return entries;
        }

        private string GetRelativePath(string fullPath)
        {
            return fullPath.Substring(_workspacePath.Length + 1);
        }

        public void PushDirectory()
        {
            var entries = ListAll();
            DirectoryChanged?.Invoke(_workspacePath, entries);
        }

        public string ReadFile(string relativePath)
        {
            string fullPath = Path.Combine(_workspacePath, relativePath);
            return File.ReadAllText(fullPath);
        }

        public void WriteFile(string relativePath, string content)
        {
            string fullPath = Path.Combine(_workspacePath, relativePath);
            string dir = Path.GetDirectoryName(fullPath);
            Directory.CreateDirectory(dir);
            SuspendWhile(() => File.WriteAllText(fullPath, content));
            PushDirectory();
        }

        public string CreateFile(string relativePath)
        {
            string fullPath = Path.Combine(_workspacePath, relativePath);
            string dir = Path.GetDirectoryName(fullPath);
            Directory.CreateDirectory(dir);
            if (!File.Exists(fullPath))
                SuspendWhile(() => File.WriteAllText(fullPath, ""));
            PushDirectory();
            return GetRelativePath(fullPath);
        }

        public string CreateFolder(string relativePath)
        {
            string fullPath = Path.Combine(_workspacePath, relativePath);
            Directory.CreateDirectory(fullPath);
            PushDirectory();
            return GetRelativePath(fullPath);
        }

        public bool Rename(string oldRelativePath, string newName)
        {
            string oldFull = Path.Combine(_workspacePath, oldRelativePath);
            string parent = Path.GetDirectoryName(oldFull);
            string newFull = Path.Combine(parent, newName);
            if (oldFull == newFull || !File.Exists(oldFull) && !Directory.Exists(oldFull))
                return false;
            try
            {
                SuspendWhile(() =>
                {
                    if (Directory.Exists(oldFull))
                        Directory.Move(oldFull, newFull);
                    else
                        File.Move(oldFull, newFull);
                });
                PushDirectory();
                return true;
            }
            catch { return false; }
        }

        public bool Delete(string relativePath)
        {
            string fullPath = Path.Combine(_workspacePath, relativePath);
            try
            {
                SuspendWhile(() =>
                {
                    if (Directory.Exists(fullPath))
                        Directory.Delete(fullPath, true);
                    else if (File.Exists(fullPath))
                        File.Delete(fullPath);
                });
                PushDirectory();
                return true;
            }
            catch { return false; }
        }

        public void OpenInExplorer(string relativePath)
        {
            string fullPath = Path.Combine(_workspacePath, relativePath);
            string target = Directory.Exists(fullPath) ? fullPath : Path.GetDirectoryName(fullPath);
            if (Directory.Exists(target))
                System.Diagnostics.Process.Start("explorer.exe", target);
        }

        private void SuspendWhile(Action action)
        {
            bool wasEnabled = _watcher?.EnableRaisingEvents ?? false;
            if (_watcher != null) _watcher.EnableRaisingEvents = false;
            try { action(); }
            finally { if (_watcher != null) _watcher.EnableRaisingEvents = wasEnabled; }
        }

        public void Dispose()
        {
            if (!_disposed)
            {
                _disposed = true;
                _watcher?.Dispose();
            }
        }
    }
}
