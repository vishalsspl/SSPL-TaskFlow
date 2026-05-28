import React, { useState, useRef } from 'react';
import { UploadCloud, X, File as FileIcon, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from './button';

const FileUploader = ({ attachments = [], onChange, maxFiles = 10, maxSizeMB = 50 }) => {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const { toast } = useToast();

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        if (attachments.length + files.length > maxFiles) {
            toast({
                title: "Limit Exceeded",
                description: `You can only upload up to ${maxFiles} files.`,
                variant: "destructive"
            });
            return;
        }

        const validFiles = [];
        for (const file of files) {
            if (file.size > maxSizeMB * 1024 * 1024) {
                toast({
                    title: "File too large",
                    description: `${file.name} exceeds the ${maxSizeMB}MB limit.`,
                    variant: "destructive"
                });
            } else {
                validFiles.push(file);
            }
        }

        if (!validFiles.length) return;

        setUploading(true);
        const newAttachments = [...attachments];

        for (const file of validFiles) {
            const formData = new FormData();
            formData.append('file', file);

            try {
                const res = await api.post('/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                newAttachments.push(res.data);
            } catch (err) {
                toast({
                    title: "Upload Failed",
                    description: `Failed to upload ${file.name}.`,
                    variant: "destructive"
                });
            }
        }

        setUploading(false);
        onChange(newAttachments);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeAttachment = (indexToRemove) => {
        const updated = attachments.filter((_, idx) => idx !== indexToRemove);
        onChange(updated);
    };

    return (
        <div className="w-full space-y-4">
            <div 
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors ${uploading ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-secondary/20 cursor-pointer'}`}
                onClick={() => !uploading && fileInputRef.current?.click()}
            >
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    multiple 
                    onChange={handleFileChange} 
                    disabled={uploading}
                />
                
                {uploading ? (
                    <div className="flex flex-col items-center text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary" />
                        <p className="text-sm font-medium">Uploading files...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-muted-foreground">
                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                            <UploadCloud className="h-6 w-6 text-foreground/70" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">Click or drag files to upload</p>
                        <p className="text-xs mt-1">Supports PDFs, Images, and Documents (Max {maxSizeMB}MB)</p>
                    </div>
                )}
            </div>

            {attachments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    {attachments.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-background shadow-sm relative group overflow-hidden">
                            <div className="flex items-center space-x-3 truncate">
                                <div className="p-2 bg-primary/10 rounded-md text-primary shrink-0">
                                    <FileIcon className="h-4 w-4" />
                                </div>
                                <div className="truncate text-sm font-medium">
                                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate block" onClick={(e) => e.stopPropagation()}>
                                        {file.name}
                                    </a>
                                    <p className="text-[10px] text-muted-foreground">
                                        {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                            </div>
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 bg-background/80 backdrop-blur-sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeAttachment(idx);
                                }}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FileUploader;
