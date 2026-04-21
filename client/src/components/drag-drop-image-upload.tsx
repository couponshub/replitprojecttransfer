import { useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DragDropImageUploadProps {
  onUrl: (url: string) => void;
  fieldKey: string;
  isUploading?: boolean;
  accept?: string;
  label?: string;
  preview?: string;
}

export function DragDropImageUpload({
  onUrl,
  fieldKey,
  isUploading = false,
  accept = "image/*",
  label = "Drag & drop image or click to upload",
  preview
}: DragDropImageUploadProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files?.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        uploadImage(file);
      } else {
        toast({ title: "Invalid file", description: "Please upload an image file", variant: "destructive" });
      }
    }
  };

  const uploadImage = async (file: File) => {
    setLocalLoading(true);
    try {
      const token = localStorage.getItem("coupons_hub_token");
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      const data = await res.json();
      if (data.url) {
        onUrl(data.url);
        toast({ title: "Image uploaded!", description: data.provider === "supabase" ? "Supabase Storage లో save అయింది ✓" : "Locally saved ✓" });
      } else if (data.error === "supabase_bucket_missing") {
        toast({ title: "Supabase bucket missing", description: "Supabase Dashboard → Storage → New Bucket → 'images' (Public) create చేయండి", variant: "destructive" });
      } else {
        toast({ title: "Upload failed", description: data.error || "Unknown error", variant: "destructive" });
      }
    } catch {
      toast({ title: "Upload failed", description: "Network error", variant: "destructive" });
    } finally {
      setLocalLoading(false);
    }
  };

  const loading = isUploading || localLoading;

  return (
    <div
      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`relative rounded-xl border-2 border-dashed p-6 transition-all cursor-pointer ${
        isDragging
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
          : "border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 bg-slate-50 dark:bg-slate-900/50"
      } ${loading ? "opacity-60 pointer-events-none" : ""}`}
    >
      <input
        type="file"
        accept={accept}
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) uploadImage(f);
          e.target.value = "";
        }}
        className="hidden"
        id={fieldKey}
      />

      <label htmlFor={fieldKey} className="flex flex-col items-center justify-center gap-2 cursor-pointer">
        {loading ? (
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        ) : (
          <Upload className="w-8 h-8 text-blue-500" />
        )}
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{loading ? "Uploading..." : label}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">PNG, JPG up to 5MB</p>
        </div>
      </label>

      {preview && (
        <div className="mt-4 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 h-32 bg-slate-100 dark:bg-slate-800">
          <img src={preview} alt="Preview" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>
      )}
    </div>
  );
}
