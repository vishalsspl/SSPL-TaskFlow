import React, { useState, useRef } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { Paperclip, Loader2 } from 'lucide-react';
import { Button } from './button';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';

const RichTextEditor = ({ value, onChange, placeholder, onAttach }) => {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const { toast } = useToast();
    const { user } = useAuthStore();

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const isRestricted = user?.role === 'MEMBER';
        const limit = isRestricted ? 500 * 1024 : 25 * 1024 * 1024;

        if (file.size > limit) {
            toast({ 
                title: "File too large", 
                description: isRestricted ? "Members can only upload files up to 500KB." : "Max limit is 25MB.", 
                variant: "destructive" 
            });
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const fileData = res.data;
            
            if (onAttach) {
                onAttach(fileData);
            }
        } catch (err) {
            toast({ title: "Upload Failed", description: "Could not upload file.", variant: "destructive" });
        }
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="prose max-w-none ck-editor-custom relative">
            {onAttach && (
                <div className="absolute top-1 right-1 z-10 flex gap-2">
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-2 hover:bg-secondary/50"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        title="Attach file"
                    >
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Paperclip className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                </div>
            )}
            <CKEditor
                editor={ClassicEditor}
                data={value || ''}
                config={{
                    placeholder: placeholder,
                    toolbar: [
                        'heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', 'blockQuote', 'undo', 'redo'
                    ]
                }}
                onChange={(event, editor) => {
                    const data = editor.getData();
                    onChange(data);
                }}
            />
        </div>
    );
};

export default RichTextEditor;
