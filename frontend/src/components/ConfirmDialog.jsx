import React from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle } from 'lucide-react';

const ConfirmDialog = ({
    open,
    onOpenChange,
    onConfirm,
    title = "Are you sure?",
    description = "This action cannot be undone.",
    confirmText = "Delete",
    cancelText = "Cancel",
    variant = "destructive"
}) => {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="border-0 shadow-2xl bg-[#0a0a0a] ring-1 ring-white/10 max-w-[400px]">
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-full ${variant === 'destructive' ? 'bg-red-500/20' : 'bg-primary/20'}`}>
                            <AlertCircle className={`w-5 h-5 ${variant === 'destructive' ? 'text-red-500' : 'text-primary'}`} />
                        </div>
                        <AlertDialogTitle className="text-xl font-bold text-white Montserrat">
                            {title}
                        </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-gray-400 text-sm leading-relaxed Montserrat">
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-6 gap-3">
                    <AlertDialogCancel className="rounded-xl border-white/5 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-all Montserrat">
                        {cancelText}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className={`rounded-xl font-bold transition-all Montserrat shadow-lg active:scale-95 ${variant === 'destructive'
                                ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/20'
                                : 'bg-[#48A111] hover:bg-[#3d8a0e] text-white shadow-green-900/20'
                            }`}
                    >
                        {confirmText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default ConfirmDialog;
