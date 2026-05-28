using System;
using System.Threading.Tasks;

namespace Executor.Services
{
    public sealed class ExecutorManager : IDisposable
    {
        private IExecutorAPI _activeApi;
        private bool _disposed;

        public string ActiveApiName => _activeApi?.ApiName ?? "none";
        public ApiType ActiveApiType => _activeApi?.ApiType ?? ApiType.Xeno;
        public IExecutorAPI ActiveApi => _activeApi;
        public bool IsInitialized => _activeApi?.IsInitialized ?? false;
        public ExecutorState CurrentState => _activeApi?.CurrentState ?? ExecutorState.Error;

        public event EventHandler<ExecutorStateEventArgs> StateChanged;
        public event EventHandler<DiagnosticEventArgs> Diagnostic;
        public event EventHandler<string> UserLog;

        public ExecutorManager()
        {
        }

        public bool Initialize()
        {
            DisposeCurrentApi();

            _activeApi = new XenoExecutorService();

            WireEvents(_activeApi);

            bool result = _activeApi.Initialize();
            if (!result)
            {
                UnwireEvents(_activeApi);
                _activeApi = null;
            }

            return result;
        }

        private void WireEvents(IExecutorAPI api)
        {
            api.StateChanged += OnApiStateChanged;
            api.Diagnostic += OnApiDiagnostic;
            api.UserLog += OnApiUserLog;
        }

        private void UnwireEvents(IExecutorAPI api)
        {
            api.StateChanged -= OnApiStateChanged;
            api.Diagnostic -= OnApiDiagnostic;
            api.UserLog -= OnApiUserLog;
        }

        private void OnApiStateChanged(object sender, ExecutorStateEventArgs e)
        {
            StateChanged?.Invoke(this, e);
        }

        private void OnApiDiagnostic(object sender, DiagnosticEventArgs e)
        {
            Diagnostic?.Invoke(this, e);
        }

        private void OnApiUserLog(object sender, string message)
        {
            UserLog?.Invoke(this, message);
        }

        public Task AttachAsync()
        {
            if (_activeApi == null) return Task.CompletedTask;
            return _activeApi.AttachAsync();
        }

        public bool Execute(string script)
        {
            if (_activeApi == null) return false;
            return _activeApi.Execute(script);
        }

        public void KillRoblox()
        {
            _activeApi?.KillRoblox();
        }

        public void SetAutoAttach(bool enabled)
        {
            _activeApi?.SetAutoAttach(enabled);
        }

        public void PushFullState()
        {
            _activeApi?.PushFullState();
        }

        public bool SwitchApi(ApiType apiType)
        {
            if (_activeApi?.ApiType == apiType) return true;

            DisposeCurrentApi();
            switch (apiType)
            {
                case ApiType.Xeno:
                    _activeApi = new XenoExecutorService();
                    break;
                case ApiType.Velocity:
                    _activeApi = new VelocityExecutorService();
                    break;
                default:
                    return false;
            }
            WireEvents(_activeApi);
            return _activeApi.Initialize();
        }

        public static string SerializeState(ExecutorState state)
        {
            switch (state)
            {
                case ExecutorState.Initializing: return "initializing";
                case ExecutorState.Ready: return "ready";
                case ExecutorState.WaitingForRoblox: return "waiting-for-roblox";
                case ExecutorState.Attaching: return "attaching";
                case ExecutorState.Attached: return "attached";
                case ExecutorState.Failed: return "failed";
                case ExecutorState.RobloxClosed: return "roblox-closed";
                case ExecutorState.Error: return "error";
                default: return "error";
            }
        }

        private void DisposeCurrentApi()
        {
            if (_activeApi != null)
            {
                UnwireEvents(_activeApi);
                _activeApi.Dispose();
                _activeApi = null;
            }
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;
            DisposeCurrentApi();
        }
    }
}
