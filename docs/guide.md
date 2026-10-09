# User guide

[Home](index.md#clone-in-drive) · [Español](guia.md)

Clone in Drive comes as a Chrome extension and as a Google Workspace add-on. The options are the same in both; what changes is where they appear and how progress is shown.

## Opening it

- **Chrome extension**: open Google Drive and click the Clone in Drive icon, in Drive's right side rail or in Chrome's extensions toolbar. A panel opens next to Drive.
- **Add-on**: select what you want to clone in Drive and click the Clone in Drive icon in the right side panel.

The first time, Google asks for authorization to access your Drive. Check every permission: without them the copy cannot complete.

## 1. Source: what gets cloned

- Select one or more files or folders in Drive. In the extension, press **Use Drive selection**; the add-on picks them up on its own.
- In the extension you can also paste the link of a file or folder.
- If you pick a shortcut, the real file or folder it points to is cloned. This is the usual case for folders others shared with you.

## 2. Destination: where the copy goes

- Browse the folders to the one you want: the destination is the last one shown in the path.
- You can choose My Drive, any subfolder or a shared drive.
- You can also paste the link of the destination folder.

## 3. Name

When cloning a single item you can rename it. When cloning several, each copy keeps its original name.

## 4. Permissions

| Option | What it does |
|---|---|
| **Inherit from destination** | Adds nobody. The copy gets the access of the folder you put it in; in a private folder, only you can see it. |
| **Keep the original ones** | The copy is shared with the same people as the original. No notification emails are sent. |
| **Set new ones** | You type the email addresses and the role (viewer, commenter or editor), and choose whether to notify them by email. They are applied to the main copy and its contents inherit them. |

In My Drive, whoever clones is always the owner of the copy. With *Keep the original ones*, the owner of the original becomes an editor.

## 5. Cloning and following progress

- **Extension**: it first counts the files and then shows a bar with exact progress and the current file. Keep the panel open until it finishes.
- **Add-on**: progress is shown as `57/240 (23 %)`. Long copies keep going on their own in the background, even if you close Drive; press **Refresh** to see how they are doing. While the background run is starting, the button reads **Continue** and each click advances one batch. Only one copy can be in progress at a time.

When it finishes you get a link to open the copy and, if there were any, the list of skipped or failed files.

## Cancelling and resuming

- **Cancel** stops the copy. What was already copied stays in the destination.
- **Resume** completes a copy that was left halfway: check it and clone again with the same destination and the same name. It reuses the folders that already exist and only copies the missing files. It compares by name; it does not detect whether a file's contents changed.

## Frequently asked questions

**Are my files downloaded?**
No. Google makes the copy inside Drive; nothing goes through your computer or through servers of ours.

**Does the copy take up space?**
Yes, each copy counts against your storage like any file of yours.

**Why did it stop with a quota message?**
Drive allows copying up to 750 GB per day, and rejects copies when your storage is full. Once quota is available again, use *Resume* (or *Continue* in the add-on) and it picks up where it left off.

**Why were some files skipped?**
Their owners disabled copying for viewers and commenters. They appear in the skipped list.

**What happens to shortcuts inside a folder?**
They are recreated as shortcuts to the same target; what they point to is not cloned.

**Are comments and version history copied?**
No. The current contents of each file are copied.

**What if the original folder changes while it is being copied?**
Some file may be left uncopied. When it finishes, clone again with *Resume* to complete it.

## Help

[Report a problem](https://github.com/arendondiosa/google-drive-ext/issues) · arendondiosa@gmail.com
