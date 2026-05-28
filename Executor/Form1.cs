using Microsoft.Web.WebView2.Core;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Web.Script.Serialization;
using System.Threading.Tasks;
using System.Windows.Forms;
using Executor.Services;

namespace Executor
{
    internal static class NativeConstants
    {
        public const int WM_NCLBUTTONDOWN = 0xA1;
        public const int HTCAPTION = 0x2;
        public const int WM_SYSCOMMAND = 0x0112;
        public const int SC_MINIMIZE = 0xF020;
        public const int SC_MAXIMIZE = 0xF030;
        public const int SC_RESTORE = 0xF120;

        public const int DWMWA_WINDOW_CORNER_PREFERENCE = 33;
        public const int DWMWCP_DONOTROUND = 1;
        public const int DWMWCP_ROUND = 2;

        public const int DWMWA_SYSTEMBACKDROP_TYPE = 38;
        public const int DWMSBT_MAINWINDOW = 2;

    }

    internal static class NativeMethods
    {
        [DllImport("user32.dll")]
        public static extern bool ReleaseCapture();

        [DllImport("user32.dll")]
        public static extern IntPtr SendMessage(IntPtr hWnd, int Msg, int wParam, int lParam);

        [DllImport("user32.dll")]
        public static extern bool PostMessage(IntPtr hWnd, int Msg, int wParam, int lParam);

        [DllImport("dwmapi.dll")]
        public static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);
    }

    public partial class Form1 : Form
    {
        private ExecutorManager _executor;
        private FileSystemService _fileSystem;
        private readonly SettingsManager _settings;
        private readonly JavaScriptSerializer _json = new JavaScriptSerializer();

        private Panel _loadingOverlay;
        private Panel _loadingBarTrack;
        private Panel _loadingBarFill;
        private Timer _loadingSmoothTimer;
        private int _loadingCurrent;
        private int _loadingTarget;

        public Form1()
        {
            InitializeComponent();
            BackColor = Color.FromArgb(11, 11, 13);
            FormBorderStyle = FormBorderStyle.None;
            StartPosition = FormStartPosition.CenterScreen;
            MinimumSize = new Size(900, 600);
            DoubleBuffered = true;
            Resize += Form1_Resize;
            Load += Form1_Load;
            FormClosed += Form1_FormClosed;
            Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);

            string appData = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                Application.ProductName ?? "Executor");
            _settings = new SettingsManager(appData);
        }

        private async void Form1_Load(object sender, EventArgs e)
        {
            try
            {
                EnableMica();
                CreateLoadingOverlay();
                UpdateProgress(15);

                await webView21.EnsureCoreWebView2Async();
                UpdateProgress(40);

                ConfigureWebView();
                UpdateProgress(50);

                InitializeService();
                UpdateProgress(65);

                webView21.Source = new Uri("https://app/index.html");
                UpdateProgress(70);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Failed to initialize:\n\n" + ex.Message, "Startup Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void ConfigureWebView()
        {
            webView21.Dock = DockStyle.Fill;

            string baseDir = AppDomain.CurrentDomain.BaseDirectory;

            string distPath = TryResolveDist(baseDir);
            if (distPath == null)
            {
                MessageBox.Show(
                    "Frontend dist folder not found.\n\n" +
                    "Looked in:\n" +
                    $"  {Path.GetFullPath(Path.Combine(baseDir, "..", "..", "..", "frontend", "dist"))}\n" +
                    $"  {Path.GetFullPath(Path.Combine(baseDir, "frontend", "dist"))}\n" +
                    $"  {Path.GetFullPath(Path.Combine(baseDir, "dist"))}",
                    "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            webView21.CoreWebView2.SetVirtualHostNameToFolderMapping("app", distPath, CoreWebView2HostResourceAccessKind.Allow);
            webView21.CoreWebView2.WebMessageReceived += WebMessageReceived;
            webView21.CoreWebView2.NavigationCompleted += OnNavigationCompleted;
            webView21.CoreWebView2.Settings.AreDevToolsEnabled = true;
            webView21.CoreWebView2.Settings.IsStatusBarEnabled = false;
            webView21.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
        }

        private static string TryResolveDist(string baseDir)
        {
            string[] candidates =
            {
                Path.Combine(baseDir, "..", "..", "..", "frontend", "dist"),
                Path.Combine(baseDir, "frontend", "dist"),
                Path.Combine(baseDir, "dist"),
            };

            foreach (string path in candidates)
            {
                string full = Path.GetFullPath(path);
                if (Directory.Exists(full))
                    return full;
            }

            return null;
        }

        private void OnNavigationCompleted(object sender, CoreWebView2NavigationCompletedEventArgs e)
        {
            if (e.IsSuccess) _executor?.PushFullState();
        }

        private void CreateLoadingOverlay()
        {
            Color bg, track, fill;
            GetThemeColors(_settings.Get("theme", "dark"), out bg, out track, out fill);

            _loadingOverlay = new Panel
            {
                Dock = DockStyle.Fill,
                BackColor = bg,
            };

            var pb = new PictureBox
            {
                Size = new Size(100, 100),
                SizeMode = PictureBoxSizeMode.Zoom,
                BackColor = Color.Transparent,
            };

            string imgPath = Path.Combine(
                AppDomain.CurrentDomain.BaseDirectory,
                "Resources", "gatofoto.png");
            if (File.Exists(imgPath))
            {
                try { pb.Image = Image.FromFile(imgPath); }
                catch { }
            }

            _loadingBarTrack = new Panel
            {
                Width = 240,
                Height = 2,
                BackColor = track,
            };

            _loadingBarFill = new Panel
            {
                Height = 2,
                Width = 0,
                BackColor = fill,
            };
            _loadingBarTrack.Controls.Add(_loadingBarFill);

            void Center()
            {
                int cx = _loadingOverlay.ClientSize.Width / 2;
                int cy = _loadingOverlay.ClientSize.Height / 2;
                pb.Location = new Point(cx - 50, cy - 74);
                _loadingBarTrack.Location = new Point(cx - _loadingBarTrack.Width / 2, cy + 36);
            }
            _loadingOverlay.Resize += (s, e) => Center();
            Center();

            _loadingOverlay.Controls.Add(pb);
            _loadingOverlay.Controls.Add(_loadingBarTrack);
            Controls.Add(_loadingOverlay);
            _loadingOverlay.BringToFront();
        }

        private static void GetThemeColors(string theme, out Color bg, out Color track, out Color fill)
        {
            switch (theme)
            {
                case "light":
                    bg = Color.FromArgb(240, 236, 230);
                    track = Color.FromArgb(214, 210, 202);
                    fill = Color.FromArgb(227, 90, 48);
                    break;
                case "pink":
                    bg = Color.FromArgb(242, 224, 234);
                    track = Color.FromArgb(220, 192, 208);
                    fill = Color.FromArgb(212, 58, 98);
                    break;
                case "darker":
                    bg = Color.FromArgb(5, 5, 8);
                    track = Color.FromArgb(20, 20, 30);
                    fill = Color.FromArgb(244, 63, 94);
                    break;
                default:
                    bg = Color.FromArgb(11, 11, 13);
                    track = Color.FromArgb(30, 30, 40);
                    fill = Color.FromArgb(244, 63, 94);
                    break;
            }
        }

        private void ApplyThemeToLoadingOverlay(string theme)
        {
            if (_loadingOverlay == null || !_loadingOverlay.Visible) return;
            Color bg, track, fill;
            GetThemeColors(theme, out bg, out track, out fill);
            _loadingOverlay.BackColor = bg;
            _loadingBarTrack.BackColor = track;
            _loadingBarFill.BackColor = fill;
        }

        private void UpdateProgress(int percent)
        {
            if (_loadingOverlay == null || !_loadingOverlay.Visible) return;

            _loadingTarget = Math.Max(_loadingTarget, Math.Min(percent, 100));

            if (_loadingSmoothTimer == null)
            {
                _loadingSmoothTimer = new Timer { Interval = 16 };
                _loadingSmoothTimer.Tick += (s, e) =>
                {
                    if (_loadingCurrent < _loadingTarget)
                    {
                        _loadingCurrent = Math.Min(_loadingCurrent + 1, _loadingTarget);
                        _loadingBarFill.Width = _loadingBarTrack.Width * _loadingCurrent / 100;
                    }
                    else
                    {
                        _loadingSmoothTimer.Stop();
                    }
                };
                _loadingSmoothTimer.Start();
            }
            else if (!_loadingSmoothTimer.Enabled)
            {
                _loadingSmoothTimer.Start();
            }
        }

        private void HideLoadingOverlay()
        {
            if (_loadingOverlay == null || !_loadingOverlay.Visible) return;

            _loadingTarget = 100;
            _loadingCurrent = 100;
            if (_loadingBarFill != null)
                _loadingBarFill.Width = _loadingBarTrack.Width;

            _loadingSmoothTimer?.Stop();
            _loadingSmoothTimer?.Dispose();
            _loadingSmoothTimer = null;

            Controls.Remove(_loadingOverlay);
            _loadingOverlay.Dispose();
            _loadingOverlay = null;
        }

        private void InitializeService()
        {
            _executor = new ExecutorManager();
            _executor.Diagnostic += OnDiagnostic;
            _executor.StateChanged += OnStateChanged;
            _executor.UserLog += OnUserLog;

            if (!_executor.Initialize())
            {
                Post(new { type = "log", message = "Executor failed to initialize. Check DLL availability.", level = "error" });
            }

            _fileSystem = new FileSystemService();
            _fileSystem.Initialize();
            _fileSystem.DirectoryChanged += OnDirectoryChanged;
        }

        private void OnDirectoryChanged(string root, List<Executor.Services.FileSystemEntry> entries)
        {
            if (InvokeRequired)
            {
                BeginInvoke(new Action(() => OnDirectoryChanged(root, entries)));
                return;
            }
            var list = new List<object>();
            foreach (var e in entries)
            {
                list.Add(new { name = e.Name, path = e.Path, isDirectory = e.IsDirectory });
            }
            Post(new { type = "fsDirectory", root, files = list });
        }

        private void OnDiagnostic(object sender, DiagnosticEventArgs e)
        {
            // Internal debug info — not forwarded to frontend
        }

        private void OnUserLog(object sender, string message)
        {
            Post(new { type = "log", message, level = "info" });
        }

        private void OnStateChanged(object sender, ExecutorStateEventArgs e)
        {
            if (InvokeRequired)
            {
                BeginInvoke(new Action(() => OnStateChanged(sender, e)));
                return;
            }

            string stateStr = ExecutorManager.SerializeState(e.State);

            Post(new
            {
                type = "stateUpdate",
                state = stateStr,
                robloxRunning = e.RobloxRunning,
                robloxProcessId = e.RobloxProcessId,
                errorMessage = e.ErrorMessage ?? "",
                apiType = (e.ApiName ?? "xeno").ToLowerInvariant()
            });
        }

        private void WebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            string json = e.WebMessageAsJson;
            string type = ParseString(json, "type");
            System.Diagnostics.Debug.WriteLine($"[IPC] Received: {type}");

            switch (type)
            {
                case "loadingTheme":
                    ApplyThemeToLoadingOverlay(ParseString(json, "value") ?? "dark");
                    break;

                case "settingsGetAll":
                    Post(new { type = "settingsData", settings = _settings.GetAll() });
                    break;

                case "settingsSet":
                    {
                        string key = ParseString(json, "key");
                        string value = ParseString(json, "value");
                        if (key != null) _settings.Set(key, value);
                        if (key == "theme") ApplyThemeToLoadingOverlay(value ?? "dark");
                    }
                    break;

                case "appReady":
                    HideLoadingOverlay();
                    break;

                case "drag":
                    NativeMethods.ReleaseCapture();
                    NativeMethods.SendMessage(Handle, NativeConstants.WM_NCLBUTTONDOWN, NativeConstants.HTCAPTION, 0);
                    break;

                case "minimize":
                    NativeMethods.PostMessage(Handle, NativeConstants.WM_SYSCOMMAND, NativeConstants.SC_MINIMIZE, 0);
                    break;

                case "maximize":
                    NativeMethods.PostMessage(Handle, NativeConstants.WM_SYSCOMMAND,
                        WindowState == FormWindowState.Maximized ? NativeConstants.SC_RESTORE : NativeConstants.SC_MAXIMIZE, 0);
                    break;

                case "close":
                    Close();
                    break;

                case "topmost":
                    TopMost = ParseBool(json, "value");
                    break;

                case "quorumAttach":
                    _ = _executor?.AttachAsync();
                    break;

                case "quorumExecute":
                    string script = ParseString(json, "script");
                    if (!string.IsNullOrWhiteSpace(script)) _executor?.Execute(script);
                    break;

                case "quorumKillRoblox":
                    _executor?.KillRoblox();
                    break;

                case "quorumSetAutoAttach":
                    _executor?.SetAutoAttach(ParseBool(json, "value"));
                    break;

                case "switchApi":
                    string apiName = ParseString(json, "api");
                    if (Enum.TryParse<ApiType>(apiName, true, out var apiType))
                    {
                        if (_executor.SwitchApi(apiType))
                        {
                            Post(new { type = "log", message = "Switched to " + apiName + " API", level = "success" });
                        }
                        else
                        {
                            Post(new { type = "log", message = "Failed to switch to " + apiName + " API", level = "error" });
                        }
                    }
                    break;

                case "openFile":
                    OpenFile();
                    break;

                case "pushFullState":
                    _executor?.PushFullState();
                    break;

                case "fsInit":
                    OnDirectoryChanged(_fileSystem.WorkspacePath, _fileSystem.ListAll());
                    break;

                case "fsRead":
                    string readPath = ParseString(json, "path");
                    string requestId = ParseString(json, "requestId");
                    if (!string.IsNullOrEmpty(readPath))
                    {
                        try
                        {
                            string content = _fileSystem.ReadFile(readPath);
                            string lang = ResolveExtension(Path.GetExtension(readPath));
                            Post(new { type = "fsReadResult", requestId, path = readPath, content, language = lang });
                        }
                        catch (Exception ex)
                        {
                            Post(new { type = "fsError", requestId, message = ex.Message });
                        }
                    }
                    break;

                case "fsSave":
                    string savePath = ParseString(json, "path");
                    string saveContent = ParseString(json, "content");
                    if (!string.IsNullOrEmpty(savePath) && saveContent != null)
                    {
                        try { _fileSystem.WriteFile(savePath, saveContent); }
                        catch (Exception ex) { Post(new { type = "log", message = "Failed to save: " + ex.Message, level = "error" }); }
                    }
                    break;

                case "fsCreateFile":
                    string createFile = ParseString(json, "path");
                    if (!string.IsNullOrEmpty(createFile))
                    {
                        try { _fileSystem.CreateFile(createFile); }
                        catch (Exception ex) { Post(new { type = "log", message = "Failed to create file: " + ex.Message, level = "error" }); }
                    }
                    break;

                case "fsCreateFolder":
                    string createFolder = ParseString(json, "path");
                    if (!string.IsNullOrEmpty(createFolder))
                    {
                        try { _fileSystem.CreateFolder(createFolder); }
                        catch (Exception ex) { Post(new { type = "log", message = "Failed to create folder: " + ex.Message, level = "error" }); }
                    }
                    break;

                case "fsRename":
                    string oldPath = ParseString(json, "oldPath");
                    string newName = ParseString(json, "newName");
                    if (!string.IsNullOrEmpty(oldPath) && !string.IsNullOrEmpty(newName))
                    {
                        try { _fileSystem.Rename(oldPath, newName); }
                        catch (Exception ex) { Post(new { type = "log", message = "Failed to rename: " + ex.Message, level = "error" }); }
                    }
                    break;

                case "fsDelete":
                    string deletePath = ParseString(json, "path");
                    if (!string.IsNullOrEmpty(deletePath))
                    {
                        try { _fileSystem.Delete(deletePath); }
                        catch (Exception ex) { Post(new { type = "log", message = "Failed to delete: " + ex.Message, level = "error" }); }
                    }
                    break;

                case "fsOpenInExplorer":
                    string revealPath = ParseString(json, "path");
                    if (!string.IsNullOrEmpty(revealPath))
                        _fileSystem.OpenInExplorer(revealPath);
                    break;
            }
        }

        private void OpenFile()
        {
            using (var dialog = new OpenFileDialog())
            {
                dialog.Title = "Open Script";
                dialog.Filter = "Lua Files (*.lua)|*.lua|Text Files (*.txt)|*.txt|All Files (*.*)|*.*";
                dialog.FilterIndex = 1;
                dialog.RestoreDirectory = true;

                if (dialog.ShowDialog() != DialogResult.OK) return;

                try
                {
                    string content = File.ReadAllText(dialog.FileName);

                    Post(new
                    {
                        type = "openFileResult",
                        name = Path.GetFileName(dialog.FileName),
                        content,
                        language = ResolveExtension(Path.GetExtension(dialog.FileName))
                    });
                }
                catch (Exception ex)
                {
                    Post(new { type = "log", message = "Failed to read file: " + ex.Message, level = "error" });
                }
            }
        }

        private static string ResolveExtension(string ext)
        {
            switch (ext.ToLowerInvariant())
            {
                case ".lua": return "lua";
                case ".js": return "javascript";
                case ".ts": return "typescript";
                case ".py": return "python";
                case ".json": return "json";
                case ".html": return "html";
                case ".css": return "css";
                case ".xml": return "xml";
                case ".yaml":
                case ".yml": return "yaml";
                case ".md": return "markdown";
                default: return "plaintext";
            }
        }

        private void Post(object obj)
        {
            try
            {
                string json = _json.Serialize(obj);
                webView21?.CoreWebView2?.PostWebMessageAsJson(json);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[Form1] Post error: " + ex.Message);
            }
        }

        private static string ParseString(string json, string key)
        {
            string search = "\"" + key + "\":\"";
            int start = json.IndexOf(search, StringComparison.Ordinal);
            if (start < 0) return null;
            start += search.Length;
            var sb = new StringBuilder();
            for (int i = start; i < json.Length; i++)
            {
                char c = json[i];
                if (c == '\\' && i + 1 < json.Length)
                {
                    char n = json[++i];
                    switch (n) { case '"': sb.Append('"'); break; case '\\': sb.Append('\\'); break; case 'n': sb.Append('\n'); break; case 'r': sb.Append('\r'); break; case 't': sb.Append('\t'); break; default: sb.Append(n); break; }
                }
                else if (c == '"') break;
                else sb.Append(c);
            }
            return sb.ToString();
        }

        private static bool ParseBool(string json, string key)
        {
            string search = "\"" + key + "\":";
            int start = json.IndexOf(search, StringComparison.Ordinal);
            if (start < 0) return false;
            start += search.Length;
            while (start < json.Length && json[start] == ' ') start++;
            return start + 4 <= json.Length && string.Compare(json, start, "true", 0, 4, StringComparison.Ordinal) == 0;
        }

        private void Form1_Resize(object sender, EventArgs e)
        {
            int pref = WindowState == FormWindowState.Maximized ? NativeConstants.DWMWCP_DONOTROUND : NativeConstants.DWMWCP_ROUND;
            try { NativeMethods.DwmSetWindowAttribute(Handle, NativeConstants.DWMWA_WINDOW_CORNER_PREFERENCE, ref pref, sizeof(int)); } catch { }
        }

        private void EnableMica()
        {
            int backdrop = NativeConstants.DWMSBT_MAINWINDOW;
            try { NativeMethods.DwmSetWindowAttribute(Handle, NativeConstants.DWMWA_SYSTEMBACKDROP_TYPE, ref backdrop, sizeof(int)); } catch { }
        }

        private void Form1_FormClosed(object sender, FormClosedEventArgs e)
        {
            _fileSystem?.Dispose();
            _executor?.Dispose();
        }
    }

}
