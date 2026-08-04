// ============================================================
// Magnum CPA Package Helper — Setup
// ============================================================
// Source for MagnumPackageHelperSetup.exe. Rebuild after editing
// ComposeOutlookDraft.vbs with:
//
//   %WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe ^
//     /target:winexe /out:..\MagnumPackageHelperSetup.exe ^
//     /res:..\ComposeOutlookDraft.vbs,ComposeOutlookDraft.vbs ^
//     Installer.cs
//
// What it does when double-clicked, on ANY Windows PC:
//   1. Copies the embedded ComposeOutlookDraft.vbs to a per-user
//      folder (%LOCALAPPDATA%\MagnumCPAPackageHelper) — no admin
//      rights needed, nothing outside your own profile is touched.
//   2. Registers the "magnumpkg:" link protocol under
//      HKEY_CURRENT_USER pointing at that copy.
//   3. Shows a confirmation message box.
// This makes setup on a new machine "download the exe, double-
// click it" instead of hand-editing a .reg file's hardcoded path.
// ============================================================

using System;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using Microsoft.Win32;

static class Installer
{
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    static extern int MessageBox(IntPtr hWnd, string text, string caption, uint type);

    const uint MB_ICONINFORMATION = 0x40;
    const uint MB_ICONERROR = 0x10;

    [STAThread]
    static void Main()
    {
        try
        {
            string installDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "MagnumCPAPackageHelper");
            Directory.CreateDirectory(installDir);

            string vbsPath = Path.Combine(installDir, "ComposeOutlookDraft.vbs");
            ExtractEmbeddedScript(vbsPath);
            RegisterProtocol(vbsPath);

            MessageBox(IntPtr.Zero,
                "Magnum CPA Package Helper installed successfully.\n\n" +
                "\"Open in Outlook\" in the Service Package Builder will now attach " +
                "the generated PDF automatically.\n\nInstalled to:\n" + installDir,
                "Setup Complete", MB_ICONINFORMATION);
        }
        catch (Exception ex)
        {
            MessageBox(IntPtr.Zero,
                "Setup failed:\n\n" + ex.Message,
                "Magnum CPA Package Helper", MB_ICONERROR);
        }
    }

    static void ExtractEmbeddedScript(string destinationPath)
    {
        var asm = Assembly.GetExecutingAssembly();
        using (var resourceStream = asm.GetManifestResourceStream("ComposeOutlookDraft.vbs"))
        {
            if (resourceStream == null)
                throw new InvalidOperationException("Embedded ComposeOutlookDraft.vbs resource not found.");
            using (var fileStream = new FileStream(destinationPath, FileMode.Create, FileAccess.Write))
            {
                resourceStream.CopyTo(fileStream);
            }
        }
    }

    static void RegisterProtocol(string vbsPath)
    {
        using (var protocolKey = Registry.CurrentUser.CreateSubKey(@"Software\Classes\magnumpkg"))
        {
            protocolKey.SetValue("", "URL:Magnum CPA Package Protocol");
            protocolKey.SetValue("URL Protocol", "");

            using (var iconKey = protocolKey.CreateSubKey("DefaultIcon"))
                iconKey.SetValue("", "wscript.exe,1");

            using (var commandKey = protocolKey.CreateSubKey(@"shell\open\command"))
                commandKey.SetValue("", "wscript.exe \"" + vbsPath + "\" \"%1\"");
        }
    }
}
