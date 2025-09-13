// globals.d.ts
interface Window {
    showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
}