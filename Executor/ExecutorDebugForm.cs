using System;
using System.Drawing;
using System.Windows.Forms;
using Executor.Services;

namespace Executor
{
    public class ExecutorDebugForm : Form
    {
        private readonly ExecutorManager _executor = new ExecutorManager();

        // ── Status labels ──
        private readonly Label _lblInitialized = new Label();
        private readonly Label _lblAttached = new Label();
        private readonly Label _lblState = new Label();
        private readonly Label _lblRobloxPid = new Label();
        private readonly Label _lblLastError = new Label();
        private readonly Label _lblAutoInject = new Label();

        // ── Controls ──
        private readonly TextBox _txtScript = new TextBox();
        private readonly TextBox _txtLog = new TextBox();

        // ── Button state tracking ──
        private bool _autoInjectOn;

        public ExecutorDebugForm()
        {
            Text = "Xeno Backend Debug Console";
            Size = new Size(860, 720);
            MinimumSize = new Size(700, 550);
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = Color.FromArgb(30, 30, 35);
            ForeColor = Color.FromArgb(220, 220, 230);
            Font = new Font("Segoe UI", 10);
            FormClosing += OnFormClosing;

            // Wire backend events
            _executor.StateChanged += OnStateChanged;
            _executor.Diagnostic += OnDiagnostic;
            _executor.UserLog += OnUserLog;

            BuildUi();
            AppendLog("[APP] ExecutorManager created. Click Initialize to start.");
        }

        // ════════════════════════════════════════════════════════════════
        //  UI BUILD
        // ════════════════════════════════════════════════════════════════

        private void BuildUi()
        {
            var root = new TableLayoutPanel
            {
                Dock = DockStyle.Fill,
                Padding = new Padding(10),
                ColumnCount = 1,
                RowCount = 5,
            };
            root.RowStyles.Add(new RowStyle(SizeType.Absolute, 140));   // Status
            root.RowStyles.Add(new RowStyle(SizeType.Absolute, 48));    // Buttons
            root.RowStyles.Add(new RowStyle(SizeType.AutoSize));        // Script header + execute btn
            root.RowStyles.Add(new RowStyle(SizeType.Percent, 30));     // Script textbox
            root.RowStyles.Add(new RowStyle(SizeType.Percent, 70));     // Log

            // ── Row 0: Status ──
            root.Controls.Add(BuildStatusPanel(), 0, 0);

            // ── Row 1: Buttons ──
            root.Controls.Add(BuildButtonPanel(), 0, 1);

            // ── Row 2: Script header + execute ──
            root.Controls.Add(BuildScriptHeader(), 0, 2);

            // ── Row 3: Script input ──
            _txtScript.Multiline = true;
            _txtScript.Dock = DockStyle.Fill;
            _txtScript.BackColor = Color.FromArgb(20, 20, 25);
            _txtScript.ForeColor = Color.FromArgb(210, 210, 220);
            _txtScript.BorderStyle = BorderStyle.FixedSingle;
            _txtScript.Font = new Font("Consolas", 10);
            _txtScript.ScrollBars = ScrollBars.Both;
            _txtScript.WordWrap = false;
            _txtScript.Text = "-- Type your script here\nprint(\"Hello from Xeno!\")";
            root.Controls.Add(_txtScript, 0, 3);

            // ── Row 4: Log ──
            var logGroup = new GroupBox
            {
                Text = " Log ",
                Dock = DockStyle.Fill,
                ForeColor = Color.FromArgb(150, 150, 160),
                Font = new Font("Segoe UI", 9, FontStyle.Bold),
                Padding = new Padding(8, 16, 8, 8),
            };
            _txtLog.Multiline = true;
            _txtLog.Dock = DockStyle.Fill;
            _txtLog.BackColor = Color.FromArgb(16, 16, 20);
            _txtLog.ForeColor = Color.FromArgb(180, 180, 190);
            _txtLog.BorderStyle = BorderStyle.FixedSingle;
            _txtLog.Font = new Font("Consolas", 9);
            _txtLog.ScrollBars = ScrollBars.Both;
            _txtLog.WordWrap = true;
            _txtLog.ReadOnly = true;
            logGroup.Controls.Add(_txtLog);
            root.Controls.Add(logGroup, 0, 4);

            Controls.Add(root);
        }

        private GroupBox BuildStatusPanel()
        {
            var gb = new GroupBox
            {
                Text = " Status ",
                Dock = DockStyle.Fill,
                ForeColor = Color.FromArgb(150, 150, 160),
                Font = new Font("Segoe UI", 9, FontStyle.Bold),
                Padding = new Padding(10, 18, 10, 6),
            };

            var layout = new TableLayoutPanel
            {
                Dock = DockStyle.Fill,
                ColumnCount = 4,
                RowCount = 3,
                Padding = new Padding(0),
            };
            layout.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 110));
            layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 40));
            layout.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 110));
            layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 60));
            layout.RowStyles.Add(new RowStyle(SizeType.Percent, 33));
            layout.RowStyles.Add(new RowStyle(SizeType.Percent, 33));
            layout.RowStyles.Add(new RowStyle(SizeType.Percent, 34));

            AddStatusRow(layout, 0, "Initialized:", _lblInitialized, "Attached:", _lblAttached);
            AddStatusRow(layout, 1, "State:", _lblState, "Roblox PID:", _lblRobloxPid);
            AddStatusRow(layout, 2, "LastError:", _lblLastError, "AutoInject:", _lblAutoInject);

            gb.Controls.Add(layout);
            return gb;
        }

        private static void AddStatusRow(TableLayoutPanel parent, int row, string l1, Label v1, string l2, Label v2)
        {
            var ln = new Font("Segoe UI", 9);
            var lf = new Font("Consolas", 9, FontStyle.Bold);

            var leftLabel = new Label { Text = l1, Dock = DockStyle.Fill, ForeColor = Color.FromArgb(140, 140, 150), Font = ln, TextAlign = ContentAlignment.MiddleLeft };
            v1.Dock = DockStyle.Fill; v1.ForeColor = Color.FromArgb(200, 200, 210); v1.Font = lf; v1.TextAlign = ContentAlignment.MiddleLeft; v1.Text = "?";
            var rightLabel = new Label { Text = l2, Dock = DockStyle.Fill, ForeColor = Color.FromArgb(140, 140, 150), Font = ln, TextAlign = ContentAlignment.MiddleLeft };
            v2.Dock = DockStyle.Fill; v2.ForeColor = Color.FromArgb(200, 200, 210); v2.Font = lf; v2.TextAlign = ContentAlignment.MiddleLeft; v2.Text = "?";

            parent.Controls.Add(leftLabel, 0, row);
            parent.Controls.Add(v1, 1, row);
            parent.Controls.Add(rightLabel, 2, row);
            parent.Controls.Add(v2, 3, row);
        }

        private Panel BuildButtonPanel()
        {
            var p = new FlowLayoutPanel
            {
                Dock = DockStyle.Fill,
                FlowDirection = FlowDirection.LeftToRight,
                WrapContents = true,
                Padding = new Padding(0, 4, 0, 0),
            };

            AddButton(p, "Initialize", Color.FromArgb(50, 90, 50), (s, e) => DoInit());
            AddButton(p, "AttachAPI", Color.FromArgb(50, 70, 100), (s, e) => DoAttach());
            AddButton(p, "AttachAPIWState", Color.FromArgb(50, 70, 100), (s, e) => DoAttachWithState());
            AddButton(p, "KillRoblox", Color.FromArgb(110, 50, 50), (s, e) => DoKill());
            AddButton(p, "GetAttachState", Color.FromArgb(60, 60, 70), (s, e) => DoGetState());
            AddButton(p, "Toggle AutoInject", Color.FromArgb(60, 60, 70), (s, e) => DoToggleAutoInject());
            AddButton(p, "Force Refresh", Color.FromArgb(60, 60, 70), (s, e) => DoForceRefresh());

            return p;
        }

        private static void AddButton(FlowLayoutPanel parent, string text, Color backColor, EventHandler handler)
        {
            var btn = new Button
            {
                Text = text,
                FlatStyle = FlatStyle.Flat,
                FlatAppearance = { BorderColor = Color.FromArgb(80, 80, 90), MouseOverBackColor = Color.FromArgb(90, 90, 105) },
                BackColor = backColor,
                ForeColor = Color.FromArgb(210, 210, 220),
                Font = new Font("Segoe UI", 9),
                Height = 24,
                Margin = new Padding(2, 0, 2, 2),
            };
            btn.Click += handler;
            parent.Controls.Add(btn);
        }

        private Panel BuildScriptHeader()
        {
            var p = new TableLayoutPanel
            {
                Dock = DockStyle.Fill,
                ColumnCount = 2,
                RowCount = 1,
                Height = 28,
                Padding = new Padding(0, 2, 0, 0),
            };
            p.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
            p.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));

            var label = new Label
            {
                Text = " Script",
                Dock = DockStyle.Fill,
                ForeColor = Color.FromArgb(150, 150, 160),
                Font = new Font("Segoe UI", 9, FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleLeft,
            };

            var execBtn = new Button
            {
                Text = "Execute Script",
                FlatStyle = FlatStyle.Flat,
                FlatAppearance = { BorderColor = Color.FromArgb(100, 50, 50), MouseOverBackColor = Color.FromArgb(170, 60, 60) },
                BackColor = Color.FromArgb(150, 50, 50),
                ForeColor = Color.White,
                Font = new Font("Segoe UI", 9),
                Height = 26,
                Width = 130,
                Margin = new Padding(4, 0, 0, 0),
            };
            execBtn.Click += (s, e) => DoExecute();

            p.Controls.Add(label);
            p.Controls.Add(execBtn);
            return p;
        }

        // ════════════════════════════════════════════════════════════════
        //  ACTIONS
        // ════════════════════════════════════════════════════════════════

        private void DoInit()
        {
            AppendLog("═══════════════════════════════════════");
            AppendLog("[ACTION] Initialize");
            bool ok = _executor.Initialize();
            AppendLog("[RESULT] Initialize returned: " + ok);
            if (!ok)
                AppendLog("[STATE]  CurrentState: " + XenoExecutorService.SerializeState(_executor.CurrentState));
            UpdateStatus();
        }

        private void DoAttach()
        {
            AppendLog("───────────────────────────────────────");
            AppendLog("[ACTION] AttachAsync");
            _ = _executor.AttachAsync();
            AppendLog("[RESULT] AttachAsync initiated");
            UpdateStatus();
        }

        private void DoAttachWithState()
        {
            DoAttach();
        }

        private void DoExecute()
        {
            string script = _txtScript.Text;
            AppendLog("───────────────────────────────────────");
            AppendLog("[ACTION] Execute (length=" + script.Length + ")");
            bool ok = _executor.Execute(script);
            AppendLog("[RESULT] Execute returned: " + ok);
            UpdateStatus();
        }

        private void DoKill()
        {
            AppendLog("───────────────────────────────────────");
            AppendLog("[ACTION] KillRoblox");
            _executor.KillRoblox();
            AppendLog("[RESULT] KillRoblox completed");
            UpdateStatus();
        }

        private void DoGetState()
        {
            AppendLog("───────────────────────────────────────");
            AppendLog("[ACTION] GetAttachState via service");
            bool attached = _executor.CurrentState == ExecutorState.Attached;
            AppendLog("[RESULT] Current state: " + XenoExecutorService.SerializeState(_executor.CurrentState) + " | Attached: " + attached);
            UpdateStatus();
        }

        private void DoToggleAutoInject()
        {
            _autoInjectOn = !_autoInjectOn;
            AppendLog("───────────────────────────────────────");
            AppendLog("[ACTION] SetAutoInject(" + _autoInjectOn + ")");
            _executor.SetAutoAttach(_autoInjectOn);
            AppendLog("[RESULT] SetAutoInject completed");
            UpdateStatus();
        }

        private void DoForceRefresh()
        {
            AppendLog("───────────────────────────────────────");
            AppendLog("[ACTION] Force Refresh (PushFullState)");
            _executor.PushFullState();
            AppendLog("[RESULT] PushFullState completed. State: " + XenoExecutorService.SerializeState(_executor.CurrentState));
            UpdateStatus();
        }

        // ════════════════════════════════════════════════════════════════
        //  EVENT HANDLERS
        // ════════════════════════════════════════════════════════════════

        private void OnStateChanged(object sender, ExecutorStateEventArgs e)
        {
            if (InvokeRequired) { BeginInvoke(new Action(() => OnStateChanged(sender, e))); return; }
            string stateStr = XenoExecutorService.SerializeState(e.State);
            AppendLog("[EVENT] StateChanged -> " + stateStr + " | Roblox=" + e.RobloxRunning + " PID=" + e.RobloxProcessId + " API=" + (e.ApiName ?? "?"));
            if (!string.IsNullOrEmpty(e.ErrorMessage))
                AppendLog("[EVENT] ErrorMessage: " + e.ErrorMessage);
            UpdateStatus();
        }

        private void OnDiagnostic(object sender, DiagnosticEventArgs e)
        {
            if (InvokeRequired) { BeginInvoke(new Action(() => OnDiagnostic(sender, e))); return; }
            AppendLog("[DIAG] " + e.Message);
        }

        private void OnUserLog(object sender, string message)
        {
            if (InvokeRequired) { BeginInvoke(new Action(() => OnUserLog(sender, message))); return; }
            AppendLog("[USER] " + message);
        }

        // ════════════════════════════════════════════════════════════════
        //  UI HELPERS
        // ════════════════════════════════════════════════════════════════

        private void UpdateStatus()
        {
            if (InvokeRequired) { BeginInvoke(new Action(UpdateStatus)); return; }

            bool init = _executor.IsInitialized;
            ExecutorState state = _executor.CurrentState;
            string stateStr = XenoExecutorService.SerializeState(state);

            _lblInitialized.Text = init ? "YES" : "NO";
            _lblInitialized.ForeColor = init ? Color.FromArgb(80, 200, 80) : Color.FromArgb(200, 80, 80);

            _lblState.Text = stateStr;

            bool attached = state == ExecutorState.Attached;
            _lblAttached.Text = attached ? "YES" : "NO";
            _lblAttached.ForeColor = attached ? Color.FromArgb(80, 200, 80) : Color.FromArgb(200, 80, 80);

            // Derive Roblox status from state
            bool robloxRunning = attached
                || state == ExecutorState.Ready
                || state == ExecutorState.Attaching
                || state == ExecutorState.Failed;
            _lblRobloxPid.Text = robloxRunning ? "running" : "0";
            _lblRobloxPid.ForeColor = robloxRunning ? Color.FromArgb(80, 200, 80) : Color.FromArgb(180, 180, 190);

            _lblLastError.Text = "(no errors tracked)";
            _lblLastError.ForeColor = Color.FromArgb(150, 150, 160);

            _lblAutoInject.Text = _autoInjectOn ? "ON" : "OFF";
            _lblAutoInject.ForeColor = _autoInjectOn ? Color.FromArgb(80, 200, 80) : Color.FromArgb(180, 180, 190);
        }

        private void AppendLog(string message)
        {
            if (InvokeRequired) { BeginInvoke(new Action(() => AppendLog(message))); return; }

            string ts = DateTime.Now.ToString("HH:mm:ss.fff");
            _txtLog.AppendText("[" + ts + "] " + message + "\r\n");

            if (_txtLog.TextLength > 100000)
                _txtLog.Text = _txtLog.Text.Substring(_txtLog.TextLength - 60000);

            _txtLog.SelectionStart = _txtLog.TextLength;
            _txtLog.ScrollToCaret();
        }

        // ════════════════════════════════════════════════════════════════
        //  LIFECYCLE
        // ════════════════════════════════════════════════════════════════

        private void OnFormClosing(object sender, FormClosingEventArgs e)
        {
            AppendLog("[LIFECYCLE] Form closing");
            _executor.Dispose();
        }
    }
}
