using System;
using System.Windows.Forms;

namespace Executor
{
    internal static class Program
    {
        /// <summary>
        /// Launch with --debug to open the standalone backend debug console
        /// (no React/WebView2 - pure WinForms, direct executor access).
        /// </summary>
        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            if (args.Length > 0 && string.Equals(args[0], "--debug", StringComparison.OrdinalIgnoreCase))
            {
                Application.Run(new ExecutorDebugForm());
            }
            else
            {
                Application.Run(new Form1());
            }
        }
    }
}
