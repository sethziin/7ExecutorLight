extern alias VelocityAPI;

using System;
using System.Diagnostics;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using System.Timers;

namespace Executor.Services
{
    internal static class VelocityNative
    {
        public static bool IsRobloxOpen()
        {
            try { return VelocityAPI::QuorumAPI.QuorumModule.IsRobloxOpen(); }
            catch { return false; }
        }

        public static void KillRoblox()
        {
            VelocityAPI::QuorumAPI.QuorumModule.KillRoblox();
        }

        public static void UseOutput(bool enable)
        {
            try { VelocityAPI::QuorumAPI.QuorumModule.UseOutput(enable); }
            catch { }
        }

        public static void SetAttachNotify(string title, string text)
        {
            try { VelocityAPI::QuorumAPI.QuorumModule.SetAttachNotify(title, text); }
            catch { }
        }

        public static void SetAutoUpdateLogs(bool value)
        {
            try { VelocityAPI::QuorumAPI.QuorumModule._AutoUpdateLogs = value; }
            catch { }
        }

        public static void AutoUpdate()
        {
            try
            {
                var type = typeof(VelocityAPI::QuorumAPI.QuorumModule);
                var method = type.GetMethod("AutoUpdate",
                    BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic);
                if (method != null && method.GetParameters().Length == 0)
                {
                    method.Invoke(null, null);
                    return;
                }
            }
            catch { }

            try
            {
                var type = typeof(VelocityAPI::QuorumAPI.QuorumModule);
                foreach (var m in type.GetMethods(BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic))
                {
                    if (m.GetParameters().Length != 0) continue;
                    if (m.ReturnType != typeof(void)) continue;
                    string n = m.Name.ToLowerInvariant();
                    if (n.Contains("update") || n.Contains("auto") || n.Contains("check"))
                    {
                        m.Invoke(null, null);
                        return;
                    }
                }
            }
            catch { }
        }
    }

    public sealed class VelocityExecutorService : IExecutorAPI
    {
        public string ApiName => "Velocity";
        public ApiType ApiType => global::Executor.Services.ApiType.Velocity;

        // ── State ──
        private VelocityAPI::QuorumAPI.QuorumModule _module;
        private bool _initialized;
        private bool _disposed;
        private ExecutorState _state;
        private int _robloxProcessId;

        // ── Last-pushed snapshot (for dedup) ──
        private ExecutorState _snapshotState;
        private int _snapshotPid;
        private bool _snapshotRunning;

        // ── Settings ──
        private bool _autoAttachEnabled;
        private long _lastAutoAttachTicks;

        // ── Concurrency ──
        private readonly object _stateLock = new object();
        private System.Timers.Timer _monitor;
        private readonly SemaphoreSlim _attachGate = new SemaphoreSlim(1, 1);
        private CancellationTokenSource _attachCts;

        // ── Constants ──
        private const int MonitorIntervalMs = 3000;
        private const int AttachTimeoutMs = 30000;
        private const long AutoAttachCooldownTicks = TimeSpan.TicksPerSecond * 10;

        // ── Events ──
        public event EventHandler<ExecutorStateEventArgs> StateChanged;
        public event EventHandler<DiagnosticEventArgs> Diagnostic;
        public event EventHandler<string> UserLog;

        public bool IsInitialized => _initialized;
        public ExecutorState CurrentState
        {
            get { lock (_stateLock) return _state; }
        }

        // ════════════════════════════════════════════
        //  INITIALIZATION
        // ════════════════════════════════════════════

        public bool Initialize()
        {
            if (_initialized) return true;

            lock (_stateLock) _state = ExecutorState.Initializing;

            if (IntPtr.Size != 8)
            {
                TransitionTo(ExecutorState.Error, "x64 is required.");
                return false;
            }

            Log("[INIT] x64 confirmed");

            try
            {
                _module = new VelocityAPI::QuorumAPI.QuorumModule();
                Log("[INIT] QuorumModule created");
            }
            catch (Exception ex)
            {
                TransitionTo(ExecutorState.Error, "Failed to create QuorumModule: " + ex.Message);
                return false;
            }

            try
            {
                VelocityNative.AutoUpdate();
                Log("[INIT] AutoUpdate OK");
            }
            catch (Exception ex)
            {
                Log("[INIT] AutoUpdate failed (non-fatal): " + ex.GetType().Name + ": " + ex.Message);
            }

            VelocityNative.UseOutput(false);
            VelocityNative.SetAutoUpdateLogs(false);
            VelocityNative.SetAttachNotify("Executor", "Attached");

            try
            {
                _module.StartCommunication();
                Log("[INIT] StartCommunication OK");
            }
            catch (Exception ex)
            {
                TransitionTo(ExecutorState.Error, "StartCommunication failed: " + ex.Message);
                return false;
            }

            _initialized = true;
            Log("[INIT] VelocityExecutorService initialized");

            DetectRoblox();
            bool attached = _robloxProcessId > 0 && CheckApiAttached();

            ExecutorState initialState;
            if (attached)                   initialState = ExecutorState.Attached;
            else if (_robloxProcessId > 0)  initialState = ExecutorState.Ready;
            else                            initialState = ExecutorState.WaitingForRoblox;

            TransitionTo(initialState);
            StartMonitor();

            return true;
        }

        // ════════════════════════════════════════════
        //  STATE MACHINE
        // ════════════════════════════════════════════

        private void TransitionTo(ExecutorState newState, string errorMessage = null)
        {
            ExecutorState oldState;
            lock (_stateLock)
            {
                if (_state == newState && errorMessage == null)
                    return;

                oldState = _state;
                Log("[STATE] " + _state + " -> " + newState + (errorMessage != null ? " (" + errorMessage + ")" : ""));
                _state = newState;
            }

            string userMsg = StateToUserMessage(oldState, newState, errorMessage);
            if (userMsg != null)
                UserLog?.Invoke(this, userMsg);

            PushState(errorMessage);
        }

        private static string StateToUserMessage(ExecutorState oldState, ExecutorState newState, string errorMessage)
        {
            if (errorMessage != null) return errorMessage;
            switch (newState)
            {
                case ExecutorState.Attached:       return "Attached successfully";
                case ExecutorState.Attaching:      return "Attaching...";
                case ExecutorState.Failed:         return "Attach failed";
                case ExecutorState.RobloxClosed:   return oldState == ExecutorState.Attached ? "Roblox closed - connection lost" : "Roblox closed";
                case ExecutorState.WaitingForRoblox: return "Waiting for Roblox...";
                case ExecutorState.Ready:          return "Roblox detected, ready to attach";
                case ExecutorState.Error:          return "An error occurred";
                default:                           return null;
            }
        }

        private void ReconcileState()
        {
            bool robloxRunning = DetectRoblox();
            bool apiAttached = robloxRunning && CheckApiAttached();

            ExecutorState current;
            lock (_stateLock) current = _state;

            ExecutorState desired;

            if (apiAttached && robloxRunning)
            {
                desired = ExecutorState.Attached;
            }
            else if (!robloxRunning)
            {
                desired = (current == ExecutorState.Attached || current == ExecutorState.Attaching)
                    ? ExecutorState.RobloxClosed
                    : ExecutorState.WaitingForRoblox;
            }
            else
            {
                desired = (current == ExecutorState.Attached)
                    ? ExecutorState.Failed
                    : ExecutorState.Ready;
            }

            if (desired == ExecutorState.RobloxClosed && current == ExecutorState.RobloxClosed)
            {
                desired = ExecutorState.WaitingForRoblox;
            }

            if (desired != current)
            {
                TransitionTo(desired);
            }
            else
            {
                bool running = _robloxProcessId > 0;
                if (_state != _snapshotState || _robloxProcessId != _snapshotPid || running != _snapshotRunning)
                {
                    PushState();
                }
            }

            if (_autoAttachEnabled && robloxRunning && !apiAttached)
            {
                TryAutoAttach();
            }
        }

        // ════════════════════════════════════════════
        //  MONITOR LOOP
        // ════════════════════════════════════════════

        private void StartMonitor()
        {
            StopMonitor();
            _monitor = new System.Timers.Timer(MonitorIntervalMs);
            _monitor.Elapsed += OnMonitorTick;
            _monitor.AutoReset = true;
            _monitor.Start();
            Log("[MONITOR] Started (3s interval)");
        }

        private void StopMonitor()
        {
            if (_monitor != null)
            {
                _monitor.Stop();
                _monitor.Elapsed -= OnMonitorTick;
                _monitor.Dispose();
                _monitor = null;
                Log("[MONITOR] Stopped");
            }
        }

        private void OnMonitorTick(object sender, ElapsedEventArgs e)
        {
            if (_disposed) return;
            if (!_initialized) return;
            try { ReconcileState(); }
            catch (Exception ex) { Debug.WriteLine("[VelocityMonitor] Error: " + ex.Message); }
        }

        // ════════════════════════════════════════════
        //  ATTACH
        // ════════════════════════════════════════════

        public async Task AttachAsync()
        {
            if (!await _attachGate.WaitAsync(0))
            {
                Log("[ATTACH] Skipped: already in progress");
                return;
            }

            try
            {
                if (_disposed) return;

                lock (_stateLock)
                {
                    if (!_initialized) { PushState("Not initialized"); return; }
                }

                DetectRoblox();

                ExecutorState current;
                lock (_stateLock) current = _state;

                if (current == ExecutorState.Attached) { Log("[ATTACH] Already attached"); return; }

                if (_robloxProcessId <= 0)
                {
                    TransitionTo(ExecutorState.WaitingForRoblox, "Roblox is not running");
                    return;
                }

                TransitionTo(ExecutorState.Attaching);
                Log("[ATTACH] Calling AttachAPI...");

                _attachCts?.Cancel();
                _attachCts?.Dispose();
                _attachCts = new CancellationTokenSource();
                _attachCts.CancelAfter(AttachTimeoutMs);

                try
                {
                    await Task.Run(() =>
                    {
                        _module.AttachAPI(false).GetAwaiter().GetResult();
                    }, _attachCts.Token);

                    DetectRoblox();
                    bool attached = CheckApiAttached();

                    if (attached && _robloxProcessId > 0)
                    {
                        TransitionTo(ExecutorState.Attached);
                    }
                    else if (_robloxProcessId <= 0)
                    {
                        TransitionTo(ExecutorState.RobloxClosed, "Roblox closed during attach");
                    }
                    else
                    {
                        TransitionTo(ExecutorState.Failed, "AttachAPI returned without attaching");
                    }
                }
                catch (OperationCanceledException)
                {
                    DetectRoblox();
                    if (_robloxProcessId > 0)
                        TransitionTo(ExecutorState.Failed, "Attach timed out");
                    else
                        TransitionTo(ExecutorState.RobloxClosed, "Roblox closed during attach");
                }
                catch (Exception ex)
                {
                    TransitionTo(ExecutorState.Error, "Attach error: " + ex.GetType().Name + ": " + ex.Message);
                }
            }
            finally
            {
                _attachGate.Release();
            }
        }

        private void TryAutoAttach()
        {
            long now = DateTime.UtcNow.Ticks;
            if (now - _lastAutoAttachTicks < AutoAttachCooldownTicks)
                return;

            ExecutorState current;
            lock (_stateLock) current = _state;

            if (current != ExecutorState.Ready && current != ExecutorState.WaitingForRoblox)
                return;

            _lastAutoAttachTicks = now;
            Log("[AUTO] Auto-attach triggered");
            _ = AttachAsync();
        }

        // ════════════════════════════════════════════
        //  EXECUTE
        // ════════════════════════════════════════════

        public bool Execute(string script)
        {
            if (_disposed) return false;

            lock (_stateLock)
            {
                if (!_initialized) { PushState("Not initialized"); return false; }
                if (string.IsNullOrWhiteSpace(script)) { Log("[EXEC] Skipped: empty script"); return false; }
                if (_state != ExecutorState.Attached)
                {
                    string msg = _state == ExecutorState.Ready || _state == ExecutorState.WaitingForRoblox
                        ? "Not attached to Roblox"
                        : "Cannot execute in current state";
                    UserLog?.Invoke(this, msg);
                    PushState();
                    return false;
                }
            }

            DetectRoblox();
            if (_robloxProcessId <= 0)
            {
                TransitionTo(ExecutorState.RobloxClosed, "Roblox process lost");
                return false;
            }

            try
            {
                Log("[EXEC] Calling ExecuteScript...");
                var result = _module.ExecuteScript(script);
                Log("[EXEC] Result: " + result);
                PushState();
                return true;
            }
            catch (Exception ex)
            {
                TransitionTo(ExecutorState.Error, "Execute failed: " + ex.GetType().Name + ": " + ex.Message);
                return false;
            }
        }

        // ════════════════════════════════════════════
        //  KILL ROBLOX
        // ════════════════════════════════════════════

        public void KillRoblox()
        {
            if (_disposed) return;

            lock (_stateLock)
            {
                if (!_initialized) { PushState("Not initialized"); return; }
            }

            Log("[KILL] Calling KillRoblox...");
            bool killed = false;

            try
            {
                VelocityNative.KillRoblox();
                killed = true;
                Log("[KILL] VelocityNative.KillRoblox OK");
            }
            catch (Exception ex)
            {
                Log("[KILL] VelocityNative.KillRoblox threw: " + ex.GetType().Name + ": " + ex.Message);
                Log("[KILL] Falling back to process kill");

                foreach (var name in new[] { "RobloxPlayerBeta", "RobloxPlayer" })
                {
                    try
                    {
                        foreach (var proc in Process.GetProcessesByName(name))
                        {
                            proc.Kill();
                            killed = true;
                        }
                    }
                    catch { }
                }
            }

            DetectRoblox();

            string msg = _robloxProcessId <= 0
                ? (killed ? "Roblox terminated" : "No Roblox process found")
                : "KillRoblox called, waiting for process exit...";
            TransitionTo(ExecutorState.WaitingForRoblox, msg);
        }

        // ════════════════════════════════════════════
        //  AUTO ATTACH
        // ════════════════════════════════════════════

        public void SetAutoAttach(bool enabled)
        {
            _autoAttachEnabled = enabled;
            Log("[AUTO] " + (enabled ? "ON" : "OFF"));

            try
            {
                _module.SetAutoAttach(enabled);
                Log("[AUTO] SetAutoAttach(" + enabled + ") OK");
            }
            catch (Exception ex)
            {
                Log("[AUTO] SetAutoAttach failed (non-fatal): " + ex.GetType().Name + ": " + ex.Message);
            }

            PushState();

            if (enabled)
            {
                DetectRoblox();
                bool apiAttached = _robloxProcessId > 0 && CheckApiAttached();
                if (_robloxProcessId > 0 && !apiAttached)
                {
                    TryAutoAttach();
                }
            }
        }

        // ════════════════════════════════════════════
        //  HELPERS
        // ════════════════════════════════════════════

        private bool DetectRoblox()
        {
            try
            {
                foreach (var name in new[] { "RobloxPlayerBeta", "RobloxPlayer" })
                {
                    var procs = Process.GetProcessesByName(name);
                    if (procs.Length > 0)
                    {
                        _robloxProcessId = procs[0].Id;
                        return true;
                    }
                }
                _robloxProcessId = 0;
                return false;
            }
            catch
            {
                _robloxProcessId = 0;
                return false;
            }
        }

        private bool CheckApiAttached()
        {
            if (_module == null) return false;
            try
            {
                return _module.IsAttached();
            }
            catch
            {
                return false;
            }
        }

        // ════════════════════════════════════════════
        //  STATE PUSH
        // ════════════════════════════════════════════

        public void PushFullState()
        {
            if (_disposed) return;

            if (_initialized)
            {
                DetectRoblox();
                ReconcileState();
            }
            else
            {
                PushState();
            }
        }

        private void PushState(string errorMessage = null)
        {
            ExecutorState currentState;
            bool robloxRunning;
            int procId;

            lock (_stateLock)
            {
                currentState = _state;
                robloxRunning = _robloxProcessId > 0;
                procId = _robloxProcessId;
            }

            StateChanged?.Invoke(this, new ExecutorStateEventArgs(currentState, robloxRunning, procId, errorMessage, ApiName));

            _snapshotState = currentState;
            _snapshotPid = procId;
            _snapshotRunning = robloxRunning;
        }

        private void Log(string message)
        {
            Diagnostic?.Invoke(this, new DiagnosticEventArgs(message));
            Debug.WriteLine("[VelocityExecutor] " + message);
        }

        // ════════════════════════════════════════════
        //  SERIALIZE STATE
        // ════════════════════════════════════════════

        public string SerializeState()
        {
            return SerializeState(_state);
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

        // ════════════════════════════════════════════
        //  LIFECYCLE
        // ════════════════════════════════════════════

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;

            StopMonitor();

            _attachCts?.Cancel();
            _attachCts?.Dispose();
            _attachCts = null;

            _attachGate?.Dispose();

            if (_module != null)
            {
                try
                {
                    _module.StopCommunication();
                    Log("[LIFECYCLE] StopCommunication OK");
                }
                catch (Exception ex)
                {
                    Log("[LIFECYCLE] StopCommunication error: " + ex.Message);
                }
                _module = null;
            }

            Log("[LIFECYCLE] VelocityExecutorService disposed");
        }
    }
}
