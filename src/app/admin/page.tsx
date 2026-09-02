"use client";

import React, { useState, useRef, useEffect } from "react";
import { Folder, useFolders } from "@/context/FolderContext";
import { FolderCard } from "@/components/FolderCard";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { uploadFiles } from "@/lib/uploadthing";
import { MediaThumb } from "@/components/MediaThumb";
import { motion, AnimatePresence } from "framer-motion";
import { useImage } from "@/context/ImageContext";
import { useAbout, AboutContent } from "@/context/AboutContext";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

async function uploadMediaFile(file: File): Promise<string> {
  if (file.type.startsWith("video/")) {
    const [uploaded] = await uploadFiles("mediaUploader", { files: [file] });
    return uploaded.ufsUrl;
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const { error: uploadError } = await supabase.storage
    .from('wallpaper-images')
    .upload(fileName, file);
  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('wallpaper-images')
    .getPublicUrl(fileName);
  return publicUrl;
}

function SortableFolderWrapper({
  folder,
  onClick,
  isSelectMode,
  isSelected
}: {
  folder: Folder;
  onClick: () => void;
  isSelectMode?: boolean;
  isSelected?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: folder.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? (isSelectMode && isSelected ? 0.9 : 0.5) : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        onClick();
      }}
      className={`relative group ${isDragging ? 'scale-105 z-50 shadow-2xl' : ''}`}
    >
      <div className={`relative transition-all rounded-3xl ${isSelected ? 'ring-4 ring-blue-500 scale-95' : 'ring-0 hover:scale-[1.02]'}`}>
        <FolderCard folder={folder} className="w-[360px]" />
        {isSelectMode && (
          <div className={`absolute top-4 left-4 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors shadow-lg z-10 ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-black/30 border-white backdrop-blur-md'}`}>
            {isSelected && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-white stroke-[3]"><polyline points="20 6 9 17 4 12"></polyline></svg>}
          </div>
        )}
      </div>
    </div>
  );
}

function SortableImage({ src, onDelete, isSelectMode, isSelected, onToggleSelect }: { src: string, onDelete: () => void, isSelectMode?: boolean, isSelected?: boolean, onToggleSelect?: () => void }) {
  const { viewImage } = useImage();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: src });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative aspect-square group ${isDragging ? 'opacity-70 scale-105 shadow-xl' : ''}`}
    >
      <div
        className="w-full h-full relative"
        onClick={(e) => {
          e.stopPropagation();
          if (isSelectMode && onToggleSelect) {
            onToggleSelect();
          } else {
            viewImage(src);
          }
        }}
      >
        <MediaThumb src={src} className={`w-full h-full rounded-xl object-cover shadow-sm transition-all ${isSelected ? 'border-blue-500 border-4 scale-95' : 'border border-black/5 dark:border-white/10 hover:opacity-90 cursor-pointer'}`} />
        {isSelectMode && (
          <div className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-black/20 border-white backdrop-blur-md'}`}>
            {isSelected && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 text-white stroke-[3]"><polyline points="20 6 9 17 4 12"></polyline></svg>}
          </div>
        )}
      </div>
      {!isSelectMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-md cursor-pointer"
          title="Delete Image"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  );
}

function CreatePostModal({
  onClose,
  folders,
  addFolder,
  updateFolder,
}: {
  onClose: () => void;
  folders: Folder[];
  addFolder: (f: Folder) => void;
  updateFolder: (id: string, f: Folder) => void;
}) {
  const [postImages, setPostImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("default-posts");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setPostImages((prev) => [...prev, ...filesArray]);

      const newPreviews = filesArray.map(file => URL.createObjectURL(file));
      setPreviewUrls((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setPostImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handlePublish = async () => {
    if (postImages.length === 0) return;
    setIsUploading(true);

    try {
      const uploadedUrls: string[] = [];
      for (const file of postImages) {
        uploadedUrls.push(await uploadMediaFile(file));
      }

      const targetFolderId = selectedCollectionId;
      let targetFolder = folders.find(f => f.id === targetFolderId);

      if (targetFolderId === "default-posts") {
        targetFolder = folders.find(f => f.name === "Posts");
      }

      if (!targetFolder && targetFolderId === "default-posts") {
        const newFolderId = crypto.randomUUID();
        const folderName = "Posts";
        const folderColor = "#111111";

        const { data: insertedData, error: dbError } = await supabase
          .from('folders')
          .insert([
            {
              id: newFolderId,
              name: folderName,
              color: folderColor,
              images: uploadedUrls,
              sort_order: 9999,
            }
          ])
          .select();

        if (dbError) throw dbError;

        addFolder(insertedData[0]);
      } else if (targetFolder) {
        const newImages = [...targetFolder.images, ...uploadedUrls];
        const { error: dbError } = await supabase
          .from('folders')
          .update({ images: newImages })
          .eq('id', targetFolder.id);

        if (dbError) throw dbError;

        updateFolder(targetFolder.id, { ...targetFolder, images: newImages });
      }

      onClose();
    } catch (error: unknown) {
      console.error(error);
      alert("Failed to create post: " + (error as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUploading) onClose();
      }}
    >
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-[24px] w-full max-w-[500px] shadow-[0_24px_48px_rgba(0,0,0,0.2)] animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-[22px] text-[#111] dark:text-white font-bold tracking-tight">Create Post</h3>
          <button onClick={() => !isUploading && onClose()} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-zinc-600 dark:text-zinc-300">
              <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></line>
              <line x1="6" y1="6" x2="18" y2="18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></line>
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-2 mb-6">
          <label className="text-[15px] text-[#444] dark:text-zinc-300 font-semibold">Select Collection (Optional)</label>
          <select
            value={selectedCollectionId}
            onChange={(e) => setSelectedCollectionId(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 text-black dark:text-white font-medium appearance-none cursor-pointer"
          >
            <option value="default-posts">None (Default Post)</option>
            {folders.filter(f => f.name !== "Posts").map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-h-[200px] mb-6">
          <div className="grid grid-cols-3 gap-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative aspect-square rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 text-zinc-400 dark:text-zinc-500 mb-1">
                <line x1="12" y1="5" x2="12" y2="19" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></line>
                <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></line>
              </svg>
              <span className="text-xs font-semibold text-zinc-500">Upload</span>
            </div>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            {previewUrls.map((url, i) => (
              <div key={i} className="relative aspect-square group">
                {postImages[i]?.type.startsWith("video/") ? (
                  <video src={url} className="w-full h-full rounded-xl object-cover shadow-sm border border-black/5 dark:border-white/10" muted loop playsInline autoPlay />
                ) : (
                  <img src={url} alt="preview" className="w-full h-full rounded-xl object-cover shadow-sm border border-black/5 dark:border-white/10" />
                )}
                <button
                  onClick={() => removeImage(i)}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-md"
                  title="Remove Image"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={() => !isUploading && onClose()}
            className="px-6 py-3 rounded-[14px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-[15px] hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={isUploading || postImages.length === 0}
            className="px-6 py-3 rounded-[14px] bg-[#111] dark:bg-white text-white dark:text-black font-semibold text-[15px] hover:bg-[#333] dark:hover:bg-zinc-200 hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {isUploading ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-2xl">
      <label className="text-[15px] text-[#444] dark:text-zinc-300 font-semibold">{label}</label>
      {children}
    </div>
  );
}

const fieldInputClass = "w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-shadow text-black dark:text-white resize-none";

function AboutEditModal({
  about,
  updateAbout,
  onClose,
}: {
  about: AboutContent;
  updateAbout: (content: AboutContent) => Promise<void>;
  onClose: () => void;
}) {
  const [leadText, setLeadText] = useState(about.leadText);
  const [skillsText, setSkillsText] = useState(about.skills.join(", "));
  const [paragraph2, setParagraph2] = useState(about.paragraph2);
  const [paragraph3, setParagraph3] = useState(about.paragraph3);
  const [toolkit, setToolkit] = useState(about.toolkit);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateAbout({
        leadText: leadText.trim(),
        skills: skillsText.split(",").map((s) => s.trim()).filter(Boolean),
        paragraph2: paragraph2.trim(),
        paragraph3: paragraph3.trim(),
        toolkit: toolkit.trim(),
      });
      onClose();
    } catch (error: unknown) {
      console.error(error);
      alert("Failed to save About content: " + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-[24px] w-full max-w-[600px] shadow-[0_24px_48px_rgba(0,0,0,0.2)] animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h3 className="text-[22px] text-[#111] dark:text-white font-bold tracking-tight">Edit About Section</h3>
          <button onClick={() => !isSaving && onClose()} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-zinc-600 dark:text-zinc-300">
              <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></line>
              <line x1="6" y1="6" x2="18" y2="18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></line>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
          <Field label="Lead Sentence">
            <textarea
              value={leadText}
              onChange={(e) => setLeadText(e.target.value)}
              rows={2}
              className={fieldInputClass}
            />
          </Field>

          <Field label="Skills (comma-separated)">
            <input
              type="text"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              className={fieldInputClass}
              placeholder="3D Animation, Storyboarding, Concept Art"
            />
          </Field>

          <Field label="Paragraph 2">
            <textarea
              value={paragraph2}
              onChange={(e) => setParagraph2(e.target.value)}
              rows={4}
              className={fieldInputClass}
            />
          </Field>

          <Field label="Paragraph 3">
            <textarea
              value={paragraph3}
              onChange={(e) => setParagraph3(e.target.value)}
              rows={4}
              className={fieldInputClass}
            />
          </Field>

          <Field label="Toolkit (comma-separated)">
            <input
              type="text"
              value={toolkit}
              onChange={(e) => setToolkit(e.target.value)}
              className={fieldInputClass}
              placeholder="Blender 3D, Unreal Engine, Maya"
            />
          </Field>
        </div>

        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
          <button
            onClick={() => !isSaving && onClose()}
            className="px-6 py-3 rounded-[14px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-[15px] hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-3 rounded-[14px] bg-[#111] dark:bg-white text-white dark:text-black font-semibold text-[15px] hover:bg-[#333] dark:hover:bg-zinc-200 hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { folders, addFolder, updateFolder, removeFolder, reorderFolders } = useFolders();
  const { about, updateAbout } = useAbout();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // FAB State
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  // Folder Select Mode State
  const [isFolderSelectMode, setIsFolderSelectMode] = useState(false);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);

  const toggleFolderSelection = (folderId: string) => {
    setSelectedFolderIds(prev =>
      prev.includes(folderId) ? prev.filter(id => id !== folderId) : [...prev, folderId]
    );
  };

  // Select Mode State
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);

  const handleCloseEditModal = () => {
    setSelectedFolder(null);
    setIsSelectMode(false);
    setSelectedImages([]);
    setIsMoveModalOpen(false);
    setIsCopyModalOpen(false);
  };

  useEffect(() => {
    const t = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  // Form state
  const [name, setName] = useState("");
  const [color, setColor] = useState("#ff9a9e");
  const [images, setImages] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingMore, setIsUploadingMore] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  const handleOpenModal = () => {
    setName("");
    setColor("#ff9a9e");
    setImages([]);
    setFiles([]);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setFiles(prev => [...prev, ...filesArray]);
      const newImageUrls = filesArray.map(file => URL.createObjectURL(file));
      setImages(prev => [...prev, ...newImageUrls]);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, i) => i !== indexToRemove));
    setFiles(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleCreateFolder = async () => {
    setIsUploading(true);
    try {
      const uploadedImageUrls: string[] = [];

      for (const file of files) {
        try {
          uploadedImageUrls.push(await uploadMediaFile(file));
        } catch (uploadError) {
          console.error("Error uploading media: ", uploadError);
        }
      }

      const finalImages = uploadedImageUrls.length > 0 ? uploadedImageUrls : images.length > 0 ? images : [
        "https://i.pinimg.com/1200x/cc/da/c6/ccdac614d96478b8e31845a39885f732.jpg",
        "https://i.pinimg.com/1200x/d5/9b/9e/d59b9e24f7ec01c87138f408999fd28b.jpg",
        "https://i.pinimg.com/1200x/80/69/e1/8069e1c4d79b4844dc35e6bb570c2eec.jpg",
        "https://i.pinimg.com/736x/11/7b/0a/117b0a8a7190ab3f0ce42edd1bf3d35f.jpg"
      ];

      const newFolderId = crypto.randomUUID();
      const folderName = name.trim() || "Untitled Collection";

      const { error: dbError } = await supabase.from('folders').insert([
        {
          id: newFolderId,
          name: folderName,
          color,
          images: finalImages
        }
      ]);

      if (dbError) {
        console.error("Error inserting folder:", dbError);
        alert("Database error: Please make sure you ran the SQL setup script in Supabase! " + dbError.message);
      } else {
        addFolder({
          id: newFolderId,
          name: folderName,
          color,
          images: finalImages
        });
      }

    } catch (error: unknown) {
      console.error(error);
      alert("An unexpected error occurred: " + (error as Error).message);
    } finally {
      setIsUploading(false);
      handleCloseModal();
    }
  };

  const handleDeleteImage = async (folderId: string, imageUrl: string) => {
    try {
      const fileName = imageUrl.split('/').pop();
      if (!fileName) return;

      const { error: storageError } = await supabase.storage.from('wallpaper-images').remove([fileName]);
      if (storageError) {
        console.warn("Storage deletion failed:", storageError);
      }

      const folder = folders.find(f => f.id === folderId);
      if (!folder) return;
      const updatedImages = folder.images.filter(img => img !== imageUrl);

      const { data, error: dbError } = await supabase.from('folders').update({ images: updatedImages }).eq('id', folderId).select();
      if (dbError) throw dbError;

      if (!data || data.length === 0) {
        throw new Error("Update blocked by Supabase RLS. Please add an UPDATE policy for the 'folders' table.");
      }

      updateFolder(folderId, { ...folder, images: updatedImages });
      setSelectedFolder(prev => prev ? { ...prev, images: updatedImages } : null);
    } catch (error: unknown) {
      console.error(error);
      alert("Failed to delete image: " + (error as Error).message);
    }
  };

  const handleUploadAdditionalImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !selectedFolder) return;
    setIsUploadingMore(true);
    try {
      const filesArray = Array.from(e.target.files);
      const uploadedImageUrls: string[] = [];

      for (const file of filesArray) {
        try {
          uploadedImageUrls.push(await uploadMediaFile(file));
        } catch (uploadError) {
          console.error("Error uploading media: ", uploadError);
        }
      }

      if (uploadedImageUrls.length > 0) {
        const newImages = [...selectedFolder.images, ...uploadedImageUrls];
        const { error: dbError } = await supabase.from('folders').update({ images: newImages }).eq('id', selectedFolder.id);
        if (dbError) throw dbError;

        setSelectedFolder({ ...selectedFolder, images: newImages });
        updateFolder(selectedFolder.id, { ...selectedFolder, images: newImages });
      }
    } catch (error: unknown) {
      console.error(error);
      alert("Failed to upload images: " + (error as Error).message);
    } finally {
      setIsUploadingMore(false);
      if (editFileInputRef.current) editFileInputRef.current.value = "";
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedFolder) return;
    updateFolder(selectedFolder.id, selectedFolder);
    try {
      const { error } = await supabase
        .from('folders')
        .update({ name: selectedFolder.name, color: selectedFolder.color, images: selectedFolder.images })
        .eq('id', selectedFolder.id);
      if (error) throw error;
    } catch (error: unknown) {
      console.error(error);
      alert("Failed to save changes: " + (error as Error).message);
    }
    setSelectedFolder(null);
  };

  const handleUpdateFolderColor = async (folderId: string, newColor: string) => {
    try {
      const folder = folders.find(f => f.id === folderId);
      if (!folder) return;

      const { error: dbError } = await supabase.from('folders').update({ color: newColor }).eq('id', folderId);
      if (dbError) throw dbError;
    } catch (error: unknown) {
      console.error(error);
      alert("Failed to change color: " + (error as Error).message);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm("Are you sure you want to delete this entire collection?")) return;
    try {
      const folder = folders.find(f => f.id === folderId);
      if (!folder) return;

      const fileNames = folder.images.map(url => url.split('/').pop()).filter(Boolean) as string[];
      if (fileNames.length > 0) {
        const { error: storageError } = await supabase.storage.from('wallpaper-images').remove(fileNames);
        if (storageError) {
          console.warn("Storage deletion failed:", storageError);
          // We can proceed even if storage delete fails (e.g. file missing)
        }
      }

      // Add .select() to ensure the row is actually returned (proves it was deleted)
      const { data, error: dbError } = await supabase.from('folders').delete().eq('id', folderId).select();

      if (dbError) throw dbError;

      // If data is null or empty, it means RLS prevented the deletion
      if (!data || data.length === 0) {
        throw new Error("Deletion blocked by Supabase RLS. Please add a DELETE policy for the 'folders' table in your Supabase dashboard.");
      }

      removeFolder(folderId);
      handleCloseEditModal();
    } catch (error: unknown) {
      console.error(error);
      alert("Failed to delete folder: " + (error as Error).message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedImages.length === 0 || !selectedFolder) return;
    if (!confirm(`Are you sure you want to delete ${selectedImages.length} images?`)) return;
    try {
      const fileNames = selectedImages.map(url => url.split('/').pop()).filter(Boolean) as string[];
      if (fileNames.length > 0) {
        const { error: storageError } = await supabase.storage.from('wallpaper-images').remove(fileNames);
        if (storageError) console.warn("Storage deletion failed:", storageError);
      }

      const updatedImages = selectedFolder.images.filter(img => !selectedImages.includes(img));
      const { data, error: dbError } = await supabase.from('folders').update({ images: updatedImages }).eq('id', selectedFolder.id).select();
      if (dbError) throw dbError;
      if (!data || data.length === 0) throw new Error("Update blocked by Supabase RLS. Please add an UPDATE policy for the 'folders' table.");

      updateFolder(selectedFolder.id, { ...selectedFolder, images: updatedImages });
      setSelectedFolder({ ...selectedFolder, images: updatedImages });
      setSelectedImages([]);
      setIsSelectMode(false);
    } catch (error: unknown) {
      console.error(error);
      alert("Failed to delete images: " + (error as Error).message);
    }
  };

  const handleBulkMove = async (targetFolderId: string) => {
    if (selectedImages.length === 0 || !selectedFolder) return;
    try {
      const targetFolder = folders.find(f => f.id === targetFolderId);
      if (!targetFolder) return;

      const newSourceImages = selectedFolder.images.filter(img => !selectedImages.includes(img));
      const newTargetImages = [...targetFolder.images, ...selectedImages];

      // Update source folder
      const { error: sourceError } = await supabase.from('folders').update({ images: newSourceImages }).eq('id', selectedFolder.id);
      if (sourceError) throw sourceError;

      // Update target folder
      const { error: targetError } = await supabase.from('folders').update({ images: newTargetImages }).eq('id', targetFolderId);
      if (targetError) throw targetError;

      // Update local state
      updateFolder(selectedFolder.id, { ...selectedFolder, images: newSourceImages });
      updateFolder(targetFolderId, { ...targetFolder, images: newTargetImages });

      setSelectedFolder({ ...selectedFolder, images: newSourceImages });
      setSelectedImages([]);
      setIsSelectMode(false);
      setIsMoveModalOpen(false);
    } catch (error: unknown) {
      console.error(error);
      alert("Failed to move images: " + (error as Error).message);
    }
  };

  const handleBulkCopy = async (targetFolderId: string) => {
    if (selectedImages.length === 0 || !selectedFolder) return;
    try {
      const targetFolder = folders.find(f => f.id === targetFolderId);
      if (!targetFolder) return;

      const newTargetImages = [...targetFolder.images, ...selectedImages];

      const { error: targetError } = await supabase.from('folders').update({ images: newTargetImages }).eq('id', targetFolderId);
      if (targetError) throw targetError;

      updateFolder(targetFolderId, { ...targetFolder, images: newTargetImages });

      setSelectedImages([]);
      setIsSelectMode(false);
      setIsCopyModalOpen(false);
    } catch (error: unknown) {
      console.error(error);
      alert("Failed to copy images: " + (error as Error).message);
    }
  };

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleBulkFolderDelete = async () => {
    if (selectedFolderIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedFolderIds.length} collections? This action cannot be undone.`)) return;

    try {
      const foldersToDelete = folders.filter(f => selectedFolderIds.includes(f.id));

      let allFileNames: string[] = [];
      foldersToDelete.forEach(f => {
        const fileNames = f.images.map(url => url.split('/').pop()).filter(Boolean) as string[];
        allFileNames = [...allFileNames, ...fileNames];
      });

      if (allFileNames.length > 0) {
        const { error: storageError } = await supabase.storage.from('wallpaper-images').remove(allFileNames);
        if (storageError) console.warn("Storage deletion failed:", storageError);
      }

      const { error: dbError } = await supabase.from('folders').delete().in('id', selectedFolderIds);
      if (dbError) throw dbError;

      selectedFolderIds.forEach(id => removeFolder(id));
      setSelectedFolderIds([]);
      setIsFolderSelectMode(false);
    } catch (error: unknown) {
      console.error(error);
      alert("Failed to delete collections: " + (error as Error).message);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveFolderId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveFolderId(null);
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const isDraggingSelected = selectedFolderIds.includes(active.id as string);
      const itemsToMove = isDraggingSelected && selectedFolderIds.length > 0
        ? selectedFolderIds
        : [active.id as string];

      const sortedItemsToMove = [...itemsToMove].sort((a, b) =>
        folders.findIndex(f => f.id === a) - folders.findIndex(f => f.id === b)
      );

      const overIndex = folders.findIndex(f => f.id === over.id);
      const activeIndex = folders.findIndex(f => f.id === active.id);

      if (isDraggingSelected && selectedFolderIds.includes(over.id as string)) {
        return;
      }

      const filteredFolders = folders.filter(f => !sortedItemsToMove.includes(f.id));
      let insertIndex = filteredFolders.findIndex(f => f.id === over.id);

      if (activeIndex < overIndex) {
        insertIndex += 1;
      }

      const newFolders = [
        ...filteredFolders.slice(0, insertIndex),
        ...sortedItemsToMove.map(id => folders.find(f => f.id === id)!),
        ...filteredFolders.slice(insertIndex)
      ];

      reorderFolders(newFolders);

      try {
        const promises = newFolders.map((folder, idx) =>
          supabase.from('folders').update({ sort_order: idx * 10 }).eq('id', folder.id)
        );
        await Promise.all(promises);
      } catch (error) {
        console.error("Failed to save new order to database:", error);
      }
    }
  };

  const handleImageDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!selectedFolder || !over || active.id === over.id) return;

    const oldIndex = selectedFolder.images.indexOf(active.id as string);
    const newIndex = selectedFolder.images.indexOf(over.id as string);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newImages = arrayMove(selectedFolder.images, oldIndex, newIndex);
      setSelectedFolder({ ...selectedFolder, images: newImages });
      updateFolder(selectedFolder.id, { ...selectedFolder, images: newImages });
    }
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col items-center min-h-screen pt-20 px-5 pb-32 gap-12 relative">

      {/* FAB Menu */}
      <div className="fixed top-4 right-5 z-[105] flex flex-col items-end gap-3">
        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={cn(
            "w-12 h-12 rounded-full bg-[#111] dark:bg-white flex items-center justify-center shadow-md transition-transform duration-300 z-50",
            isFabOpen ? "scale-[0.8] hover:scale-90" : "hover:scale-105"
          )}
        >
          <motion.div animate={{ rotate: isFabOpen ? 45 : 0 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 text-white dark:text-black">
              <line x1="12" y1="5" x2="12" y2="19" strokeWidth="2.5" strokeLinecap="round"></line>
              <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2.5" strokeLinecap="round"></line>
            </svg>
          </motion.div>
        </button>

        <AnimatePresence>
          {isFabOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.8 }}
              className="flex flex-col items-end gap-3 mt-1"
            >
              <button
                onClick={() => { setIsFabOpen(false); setIsPostModalOpen(true); }}
                className="bg-[#E5EFFF] dark:bg-blue-900/30 text-[#2563EB] dark:text-blue-400 font-bold text-[14px] px-5 py-2.5 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:opacity-90 transition-opacity"
              >
                Create Post
              </button>

              <button
                onClick={() => { setIsFabOpen(false); handleOpenModal(); }}
                className="bg-[#F3E8FF] dark:bg-purple-900/30 text-[#9333EA] dark:text-purple-400 font-bold text-[14px] px-5 py-2.5 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:opacity-90 transition-opacity"
              >
                Create Collection
              </button>

              <button
                onClick={() => { setIsFabOpen(false); setIsAboutModalOpen(true); }}
                className="bg-[#DCFCE7] dark:bg-emerald-900/30 text-[#16A34A] dark:text-emerald-400 font-bold text-[14px] px-5 py-2.5 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:opacity-90 transition-opacity"
              >
                Edit About
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Folders Container */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveFolderId(null)}
      >
        <div className="flex flex-wrap gap-y-[70px] gap-x-10 justify-center w-full max-w-[1200px] pt-10">
          <SortableContext
            items={folders.map(f => f.id)}
            strategy={rectSortingStrategy}
          >
            {folders.map(folder => (
              <SortableFolderWrapper
                key={folder.id}
                folder={folder}
                isSelectMode={isFolderSelectMode}
                isSelected={selectedFolderIds.includes(folder.id)}
                onClick={() => {
                  if (isFolderSelectMode) {
                    toggleFolderSelection(folder.id);
                  } else {
                    setSelectedFolder(folder);
                  }
                }}
              />
            ))}
          </SortableContext>
        </div>
        <DragOverlay adjustScale={false} dropAnimation={null}>
          {activeFolderId ? (
            <div className={`shadow-2xl z-[9999] opacity-90 cursor-grabbing ${selectedFolderIds.includes(activeFolderId) && selectedFolderIds.length > 1 ? 'ring-4 ring-blue-500 scale-95 rounded-3xl' : 'scale-105'}`}>
              <FolderCard folder={folders.find(f => f.id === activeFolderId)!} className="w-[360px]" />
              {selectedFolderIds.includes(activeFolderId) && selectedFolderIds.length > 1 && (
                <div className="absolute -top-3 -right-3 bg-blue-500 text-white font-bold rounded-full w-8 h-8 flex items-center justify-center shadow-lg">
                  {selectedFolderIds.length}
                </div>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Floating Action Bar for Folder Selection */}
      <AnimatePresence>
        {isFolderSelectMode && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-[0_20px_40px_rgba(0,0,0,0.2)] border border-black/5 dark:border-white/10"
          >
            <div className="flex items-center gap-3 pr-4 border-r border-zinc-200 dark:border-zinc-700">
              <button onClick={() => { setIsFolderSelectMode(false); setSelectedFolderIds([]); }} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-zinc-600 dark:text-zinc-300">
                  <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></line>
                  <line x1="6" y1="6" x2="18" y2="18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></line>
                </svg>
              </button>
              <span className="font-bold text-[15px] text-[#111] dark:text-white px-1">
                {selectedFolderIds.length}
              </span>
            </div>

            <button
              onClick={handleBulkFolderDelete}
              disabled={selectedFolderIds.length === 0}
              className="px-4 py-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-sm rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Select Collections Button */}
      <AnimatePresence>
        {!isFolderSelectMode && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={() => setIsFolderSelectMode(true)}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-[#007AFF]/85 backdrop-blur-md text-white font-semibold text-[15px] px-6 py-3 rounded-full shadow-[0_8px_30px_rgba(0,122,255,0.25)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,122,255,0.35)] transition-all flex items-center justify-center"
          >
            Select Collections
          </motion.button>
        )}
      </AnimatePresence>

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
        >
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-[24px] w-full max-w-[340px] shadow-[0_24px_48px_rgba(0,0,0,0.2)] animate-in zoom-in-95 duration-300">
            <div className="mb-6">
              <h3 className="text-[22px] text-[#111] dark:text-white font-bold tracking-tight">New Collection</h3>
            </div>

            <div className="flex flex-col gap-2 mb-4 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-2xl">
              <label htmlFor="folderName" className="text-[15px] text-[#444] dark:text-zinc-300 font-semibold">Folder Name</label>
              <input
                type="text"
                id="folderName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome Collection"
                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-shadow text-black dark:text-white"
              />
            </div>

            <div className="flex items-center justify-between mb-6 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-2xl">
              <label htmlFor="folderColor" className="text-[15px] text-[#444] dark:text-zinc-300 font-semibold">Theme Color</label>
              <input
                type="color"
                id="folderColor"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="appearance-none rounded-full w-10 h-10 border-none bg-transparent cursor-pointer p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-full [&::-moz-color-swatch]:border-none [&::-moz-color-swatch]:rounded-full shadow-sm hover:scale-105 transition-transform"
              />
            </div>

            <div className="flex flex-col gap-3 mb-8 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-2xl">
              <div className="flex items-center justify-between">
                <label className="text-[15px] text-[#444] dark:text-zinc-300 font-semibold">Images &amp; Videos</label>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-700 text-sm rounded-lg font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                >
                  Upload
                </button>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
              </div>
              {images.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar mt-2 pt-2">
                  {images.map((src, i) => (
                    <div key={i} className="relative flex-shrink-0 group">
                      {files[i]?.type.startsWith("video/") ? (
                        <video src={src} className="w-14 h-14 rounded-xl object-cover shadow-sm border border-black/5 dark:border-white/10" muted loop playsInline autoPlay />
                      ) : (
                        <img src={src} alt="upload" className="w-14 h-14 rounded-xl object-cover shadow-sm border border-black/5 dark:border-white/10" />
                      )}
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute -top-1.5 -right-1.5 bg-black/70 dark:bg-white/80 text-white dark:text-black rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 backdrop-blur-md shadow-md"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3">
                          <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></line>
                          <line x1="6" y1="6" x2="18" y2="18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></line>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="px-6 py-3 rounded-[14px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-[15px] hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={isUploading}
                className="px-6 py-3 rounded-[14px] bg-[#111] dark:bg-white text-white dark:text-black font-semibold text-[15px] hover:bg-[#333] dark:hover:bg-zinc-200 hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {isUploading ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {selectedFolder && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isMoveModalOpen && !isCopyModalOpen) handleCloseEditModal();
          }}
        >
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-[24px] w-full max-w-[500px] shadow-[0_24px_48px_rgba(0,0,0,0.2)] animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={selectedFolder.color}
                  onChange={(e) => {
                    const newColor = e.target.value;
                    setSelectedFolder({ ...selectedFolder, color: newColor });
                  }}
                  title="Change Collection Color"
                  className="appearance-none rounded-full w-6 h-6 border-none bg-transparent cursor-pointer p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-full [&::-moz-color-swatch]:border-none [&::-moz-color-swatch]:rounded-full shadow-sm hover:scale-110 transition-transform flex-shrink-0"
                />
                <input
                  type="text"
                  value={selectedFolder.name}
                  onChange={(e) => setSelectedFolder({ ...selectedFolder, name: e.target.value })}
                  className="text-[22px] text-[#111] dark:text-white font-bold tracking-tight bg-transparent border-none outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 rounded-md px-1 w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteFolder(selectedFolder.id)}
                  title="Delete Collection"
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors shrink-0"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
                <button onClick={handleCloseEditModal} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-zinc-600 dark:text-zinc-300">
                    <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></line>
                    <line x1="6" y1="6" x2="18" y2="18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></line>
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-[300px] overflow-y-auto custom-scrollbar">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleImageDragEnd}
              >
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  <div
                    onClick={() => editFileInputRef.current?.click()}
                    className="relative aspect-square rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    {isUploadingMore ? (
                      <div className="w-6 h-6 border-2 border-zinc-400 border-t-zinc-800 rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 text-zinc-400 dark:text-zinc-500 mb-1">
                          <line x1="12" y1="5" x2="12" y2="19" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></line>
                          <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></line>
                        </svg>
                        <span className="text-xs font-semibold text-zinc-500">Add</span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                    ref={editFileInputRef}
                    onChange={handleUploadAdditionalImages}
                  />
                  <SortableContext items={selectedFolder.images} strategy={rectSortingStrategy}>
                    {selectedFolder.images.map((src) => (
                      <SortableImage
                        key={src}
                        src={src}
                        onDelete={() => handleDeleteImage(selectedFolder.id, src)}
                        isSelectMode={isSelectMode}
                        isSelected={selectedImages.includes(src)}
                        onToggleSelect={() => {
                          setSelectedImages(prev =>
                            prev.includes(src) ? prev.filter(img => img !== src) : [...prev, src]
                          )
                        }}
                      />
                    ))}
                  </SortableContext>
                </div>
              </DndContext>
              {selectedFolder.images.length === 0 && !isUploadingMore && (
                <div className="h-[200px] flex items-center justify-center text-zinc-400 dark:text-zinc-500 font-medium">
                  No images left in this collection.
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center relative shrink-0">
              {!isSelectMode ? (
                <>
                  <button
                    onClick={() => setIsSelectMode(true)}
                    className="px-6 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    Select
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    className="px-6 py-2.5 rounded-xl bg-[#111] dark:bg-white text-white dark:text-black font-semibold text-sm hover:opacity-90 transition-opacity"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setIsSelectMode(false); setSelectedImages([]); setIsMoveModalOpen(false); setIsCopyModalOpen(false); }}
                    className="px-6 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setIsCopyModalOpen(false); setIsMoveModalOpen(!isMoveModalOpen); }}
                      disabled={selectedImages.length === 0}
                      className="px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold text-sm hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                    >
                      Move ({selectedImages.length})
                    </button>
                    <button
                      onClick={() => { setIsMoveModalOpen(false); setIsCopyModalOpen(!isCopyModalOpen); }}
                      disabled={selectedImages.length === 0}
                      className="px-4 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold text-sm hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors disabled:opacity-50"
                    >
                      Copy ({selectedImages.length})
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      disabled={selectedImages.length === 0}
                      className="px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-semibold text-sm hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      Delete ({selectedImages.length})
                    </button>
                  </div>
                  {/* Move Modal */}
                  {isMoveModalOpen && (
                    <div className="absolute bottom-full right-0 mb-2 w-64 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 p-2 z-[101]">
                      <div className="text-xs font-semibold text-zinc-500 mb-2 px-2 pt-1">Move to...</div>
                      <div className="max-h-48 overflow-y-auto custom-scrollbar">
                        {folders.filter(f => f.id !== selectedFolder.id).map(f => (
                          <button
                            key={f.id}
                            onClick={() => handleBulkMove(f.id)}
                            className="w-full text-left px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: f.color }}></div>
                            {f.name}
                          </button>
                        ))}
                        {folders.filter(f => f.id !== selectedFolder.id).length === 0 && (
                          <div className="px-3 py-2 text-sm text-zinc-500">No other collections available.</div>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Copy Modal */}
                  {isCopyModalOpen && (
                    <div className="absolute bottom-full right-0 mb-2 w-64 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 p-2 z-[101]">
                      <div className="text-xs font-semibold text-zinc-500 mb-2 px-2 pt-1">Copy to...</div>
                      <div className="max-h-48 overflow-y-auto custom-scrollbar">
                        {folders.filter(f => f.id !== selectedFolder.id).map(f => (
                          <button
                            key={f.id}
                            onClick={() => handleBulkCopy(f.id)}
                            className="w-full text-left px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: f.color }}></div>
                            {f.name}
                          </button>
                        ))}
                        {folders.filter(f => f.id !== selectedFolder.id).length === 0 && (
                          <div className="px-3 py-2 text-sm text-zinc-500">No other collections available.</div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Post Modal */}
      {isPostModalOpen && (
        <CreatePostModal
          onClose={() => setIsPostModalOpen(false)}
          folders={folders}
          addFolder={addFolder}
          updateFolder={updateFolder}
        />
      )}

      {/* Edit About Modal */}
      {isAboutModalOpen && (
        <AboutEditModal
          about={about}
          updateAbout={updateAbout}
          onClose={() => setIsAboutModalOpen(false)}
        />
      )}
    </div>
  );
}
