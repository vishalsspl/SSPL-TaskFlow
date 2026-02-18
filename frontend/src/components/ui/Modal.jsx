import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    '3xl': 'max-w-7xl',
    full: 'max-w-[95vw]',
};

const Modal = ({ isOpen, onClose, title, children, className = '', size = 'md' }) => {
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const maxWidthClass = sizeClasses[size] || sizeClasses.md;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div
                className="fixed inset-0"
                onClick={onClose}
                aria-hidden="true"
            />

            <Card className={`relative w-full ${maxWidthClass} max-h-[95vh] overflow-y-auto shadow-xl z-20 ${className}`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2 sticky top-0 bg-white z-10 border-b">
                    <CardTitle className="text-xl font-semibold">{title}</CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full"
                        onClick={onClose}
                    >
                        <X className="w-4 h-4" />
                        <span className="sr-only">Close</span>
                    </Button>
                </CardHeader>
                <CardContent className="pt-6">
                    {children}
                </CardContent>
            </Card>
        </div>
    );
};

export default Modal;
