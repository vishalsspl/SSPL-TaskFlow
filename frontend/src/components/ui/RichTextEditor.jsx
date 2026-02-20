import React from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

const RichTextEditor = ({ value, onChange, placeholder }) => {
    return (
        <div className="prose max-w-none [&_.ck-editor__editable]:min-h-[150px] [&_.ck-editor__editable]:bg-background [&_.ck-editor__editable]:text-foreground [&_.ck-toolbar]:bg-transparent [&_.ck-toolbar]:border-border [&_.ck-content]:text-sm">
            <CKEditor
                editor={ClassicEditor}
                data={value || ''}
                config={{
                    placeholder: placeholder,
                    toolbar: [
                        'heading',
                        '|',
                        'bold',
                        'italic',
                        'link',
                        'bulletedList',
                        'numberedList',
                        'blockQuote',
                        'undo',
                        'redo'
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
