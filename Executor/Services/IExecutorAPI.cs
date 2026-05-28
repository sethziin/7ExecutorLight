using System;
using System.Threading.Tasks;

namespace Executor.Services
{
    public enum ExecutorState
    {
        Initializing,
        Ready,
        WaitingForRoblox,
        Attaching,
        Attached,
        Failed,
        RobloxClosed,
        Error
    }

    public enum ApiType
    {
        Xeno,
        Velocity
    }

    public class ExecutorStateEventArgs : EventArgs
    {
        public ExecutorState State { get; }
        public bool RobloxRunning { get; }
        public int RobloxProcessId { get; }
        public string ErrorMessage { get; }
        public string ApiName { get; }

        public ExecutorStateEventArgs(ExecutorState state, bool robloxRunning, int robloxProcessId, string errorMessage = null, string apiName = null)
        {
            State = state;
            RobloxRunning = robloxRunning;
            RobloxProcessId = robloxProcessId;
            ErrorMessage = errorMessage;
            ApiName = apiName;
        }
    }

    public class DiagnosticEventArgs : EventArgs
    {
        public string Message { get; }
        public DiagnosticEventArgs(string message) => Message = message;
    }

    public interface IExecutorAPI : IDisposable
    {
        string ApiName { get; }
        ApiType ApiType { get; }
        bool IsInitialized { get; }
        ExecutorState CurrentState { get; }

        event EventHandler<ExecutorStateEventArgs> StateChanged;
        event EventHandler<DiagnosticEventArgs> Diagnostic;
        event EventHandler<string> UserLog;

        bool Initialize();
        Task AttachAsync();
        bool Execute(string script);
        void KillRoblox();
        void SetAutoAttach(bool enabled);
        void PushFullState();

        string SerializeState();
    }
}
