import React from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

const RichTextEditor = ({ value, onChange, placeholder }) => {
    return (
        <div className="prose max-w-none 
            [&_.ck-editor__editable]:min-h-[150px] 
            [&_.ck-editor__editable]:!bg-[#1A1A1A] 
            [&_.ck-editor__editable]:!text-white 
            [&_.ck-toolbar]:!bg-[#262626] 
            [&_.ck-toolbar]:!border-[#333]
            [&_.ck-toolbar__items]:!text-white
            [&_.ck-button]:!text-white
            [&_.ck-button:hover]:!bg-[#333]
            [&_.ck-content]:text-sm">
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
