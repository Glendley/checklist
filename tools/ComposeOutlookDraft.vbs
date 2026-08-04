' ============================================================
' Magnum CPA PC — Compose Outlook Draft Helper
' ============================================================
' Triggered by the "magnumpkg:" protocol handler (see
' install-outlook-protocol.reg) when "Open in Outlook" is
' clicked in the Service Package Builder's brochure modal.
'
' What it does:
'   1. Waits for, then reads, the small ...meta.txt file the
'      webpage just downloaded to this PC's Downloads folder
'      (contains To/Cc/Subject/Body as plain text).
'   2. Finds the matching ...pdf package file in Downloads.
'   3. Creates a new Outlook draft with that PDF attached and
'      the fields filled in, then DISPLAYS it (does not send —
'      you still review and click Send yourself in Outlook).
'   4. Deletes the temporary meta.txt file (the PDF is left in
'      Downloads, since that's the actual deliverable).
'
' Nothing here sends email automatically or runs unattended —
' it only opens a pre-filled draft for you to review.
' ============================================================

Option Explicit

Dim fso, shell, downloadsFolder
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
downloadsFolder = shell.ExpandEnvironmentStrings("%USERPROFILE%") & "\Downloads"

Dim metaFile, pdfFile, maxWaitSeconds, waited
maxWaitSeconds = 8
waited = 0

Do
  Set metaFile = FindNewestFile(downloadsFolder, "Service-Package-*.meta.txt")
  If Not (metaFile Is Nothing) Then Exit Do
  WScript.Sleep 500
  waited = waited + 0.5
Loop While waited < maxWaitSeconds

If metaFile Is Nothing Then
  MsgBox "Couldn't find the package details file in your Downloads folder yet." & vbCrLf & _
         "Please attach the PDF to a new email manually.", vbExclamation, "Magnum CPA Package"
  WScript.Quit
End If

Dim toAddr, ccAddr, subj, body
ParseMetaFile metaFile.Path, toAddr, ccAddr, subj, body

Set pdfFile = FindNewestFile(downloadsFolder, "Service-Package-*.pdf")

Dim outlookApp, mailItem
On Error Resume Next
Set outlookApp = GetObject(, "Outlook.Application")
If outlookApp Is Nothing Then Set outlookApp = CreateObject("Outlook.Application")
On Error Goto 0

If outlookApp Is Nothing Then
  MsgBox "Could not start Outlook. Is it installed on this PC?", vbCritical, "Magnum CPA Package"
  WScript.Quit
End If

Set mailItem = outlookApp.CreateItem(0) ' olMailItem
mailItem.To = toAddr
If ccAddr <> "" Then mailItem.CC = ccAddr
mailItem.Subject = subj
mailItem.Body = body
If Not (pdfFile Is Nothing) Then
  mailItem.Attachments.Add pdfFile.Path
Else
  MsgBox "Draft created, but no matching PDF was found in Downloads to attach." & vbCrLf & _
         "Attach it manually before sending.", vbExclamation, "Magnum CPA Package"
End If
mailItem.Display

On Error Resume Next
fso.DeleteFile metaFile.Path, True
On Error Goto 0

' ============================================================
' Helpers
' ============================================================

Function FindNewestFile(folderPath, pattern)
  Dim folder, f, newest, newestTime
  Set FindNewestFile = Nothing
  If Not fso.FolderExists(folderPath) Then Exit Function

  Set folder = fso.GetFolder(folderPath)
  Set newest = Nothing
  For Each f In folder.Files
    If MatchesPattern(f.Name, pattern) Then
      If newest Is Nothing Then
        Set newest = f
        newestTime = f.DateLastModified
      ElseIf f.DateLastModified > newestTime Then
        Set newest = f
        newestTime = f.DateLastModified
      End If
    End If
  Next

  ' Only accept a file modified within the last 2 minutes, so an old
  ' leftover download from a previous session is never picked up.
  If Not (newest Is Nothing) Then
    If DateDiff("s", newest.DateLastModified, Now) <= 120 Then
      Set FindNewestFile = newest
    End If
  End If
End Function

Function MatchesPattern(name, pattern)
  Dim starPos, prefix, suffix
  starPos = InStr(pattern, "*")
  If starPos = 0 Then
    MatchesPattern = (LCase(name) = LCase(pattern))
    Exit Function
  End If
  prefix = Left(pattern, starPos - 1)
  suffix = Mid(pattern, starPos + 1)
  MatchesPattern = (Len(name) >= Len(prefix) + Len(suffix)) And _
                   (LCase(Left(name, Len(prefix))) = LCase(prefix)) And _
                   (LCase(Right(name, Len(suffix))) = LCase(suffix))
End Function

' Reads the UTF-8 meta.txt file and pulls out To/Cc/Subject/Body.
' Format (written by downloadPackageMeta() in index.html):
'   TO:<address>
'   CC:<address or blank>
'   SUBJECT:<subject line>
'   BODY_START
'   <body text, any number of lines>
'   BODY_END
Sub ParseMetaFile(path, toAddr, ccAddr, subj, body)
  Dim stream, content
  Set stream = CreateObject("ADODB.Stream")
  stream.Type = 2 ' text
  stream.Charset = "utf-8"
  stream.Open
  stream.LoadFromFile path
  content = stream.ReadText
  stream.Close

  Dim lines, i, line, inBody, bodyCount
  lines = Split(content, Chr(10))
  toAddr = "" : ccAddr = "" : subj = ""
  inBody = False
  bodyCount = 0

  Dim bodyLines()
  ReDim bodyLines(UBound(lines))

  For i = 0 To UBound(lines)
    line = lines(i)
    If Right(line, 1) = Chr(13) Then line = Left(line, Len(line) - 1)

    If inBody Then
      If line = "BODY_END" Then
        inBody = False
      Else
        bodyLines(bodyCount) = line
        bodyCount = bodyCount + 1
      End If
    ElseIf Left(line, 3) = "TO:" Then
      toAddr = Mid(line, 4)
    ElseIf Left(line, 3) = "CC:" Then
      ccAddr = Mid(line, 4)
    ElseIf Left(line, 8) = "SUBJECT:" Then
      subj = Mid(line, 9)
    ElseIf line = "BODY_START" Then
      inBody = True
    End If
  Next

  If bodyCount > 0 Then
    ReDim Preserve bodyLines(bodyCount - 1)
    body = Join(bodyLines, Chr(13) & Chr(10))
  Else
    body = ""
  End If
End Sub
