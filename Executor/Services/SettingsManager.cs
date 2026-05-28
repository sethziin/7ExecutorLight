using System;
using System.Collections.Generic;
using System.IO;
using System.Web.Script.Serialization;

namespace Executor.Services
{
    public class SettingsManager
    {
        private readonly string _filePath;
        private readonly JavaScriptSerializer _json = new JavaScriptSerializer();
        private Dictionary<string, string> _cache;

        public SettingsManager(string directory)
        {
            Directory.CreateDirectory(directory);
            _filePath = Path.Combine(directory, "settings.json");
            _cache = LoadFromDisk();
        }

        private Dictionary<string, string> LoadFromDisk()
        {
            try
            {
                if (File.Exists(_filePath))
                {
                    string content = File.ReadAllText(_filePath);
                    return _json.Deserialize<Dictionary<string, string>>(content) ?? new Dictionary<string, string>();
                }
            }
            catch { }
            return new Dictionary<string, string>();
        }

        private void SaveToDisk()
        {
            try
            {
                string content = _json.Serialize(_cache);
                File.WriteAllText(_filePath, content);
            }
            catch { }
        }

        public string Get(string key, string defaultValue = null)
        {
            return _cache.TryGetValue(key, out var value) ? value : defaultValue;
        }

        public void Set(string key, string value)
        {
            _cache[key] = value;
            SaveToDisk();
        }

        public Dictionary<string, string> GetAll()
        {
            return new Dictionary<string, string>(_cache);
        }
    }
}
