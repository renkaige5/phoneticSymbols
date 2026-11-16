using System;
using System.Diagnostics;
using System.IO;
using System.Text;

// 7-Zip returns exit code 2 when winCodeSign's macOS symlinks cannot be
// created. Windows packaging only needs rcedit, so that case is success.
class Program
{
    static int Main(string[] args)
    {
        string baseDir = AppDomain.CurrentDomain.BaseDirectory;
        string real = Path.GetFullPath(Path.Combine(baseDir, "..", "..", "node_modules", "7zip-bin", "win", "x64", "7za.exe"));
        if (!File.Exists(real))
        {
            Console.Error.WriteLine("real 7za not found: " + real);
            return 1;
        }

        var psi = new ProcessStartInfo();
        psi.FileName = real;
        psi.Arguments = QuoteArgs(args);
        psi.UseShellExecute = false;
        Process process = Process.Start(psi);
        process.WaitForExit();
        if (process.ExitCode == 0)
            return 0;

        string outDir = FindOutDir(args);
        if (process.ExitCode == 2 && outDir != null && File.Exists(Path.Combine(outDir, "rcedit-x64.exe")))
            return 0;

        return process.ExitCode;
    }

    static string FindOutDir(string[] args)
    {
        for (int i = 0; i < args.Length; i++)
        {
            string arg = args[i];
            if (arg.StartsWith("-o") && arg.Length > 2)
                return arg.Substring(2);
        }
        return null;
    }

    static string QuoteArgs(string[] args)
    {
        var builder = new StringBuilder();
        for (int i = 0; i < args.Length; i++)
        {
            if (i > 0)
                builder.Append(' ');
            builder.Append(Quote(args[i]));
        }
        return builder.ToString();
    }

    static string Quote(string arg)
    {
        if (arg.IndexOf(' ') >= 0 || arg.IndexOf('\t') >= 0 || arg.IndexOf('"') >= 0)
            return "\"" + arg.Replace("\"", "\\\"") + "\"";
        return arg;
    }
}
