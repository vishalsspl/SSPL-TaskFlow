import { UserX } from 'lucide-react';
import {
 AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
 AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const UserDeleteDialog = ({ deleteTarget, setDelete, onConfirm }) => {
 return (
 <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDelete(null)}>
 <AlertDialogContent className="rounded-xl border-border/40 bg-white/95 dark:bg-black/95 backdrop-blur-2xl p-10 max-w-lg shadow-[0_0_100px_rgba(0,0,0,0.5)]">
 <AlertDialogHeader className="space-y-4">
 <div className="w-20 h-20 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto mb-2 border border-red-500/20">
 <UserX className="w-10 h-10 text-red-500" />
 </div>
 <AlertDialogTitle className="text-2xl font-semibold text-center">Delete User?</AlertDialogTitle>
 <AlertDialogDescription className="text-center text-base font-medium text-muted-foreground">
 Are you sure you want to permanently delete <b className="text-foreground">{deleteTarget?.name}</b>? This action cannot be undone and all their data will be removed.
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter className="mt-10 flex sm:justify-center gap-4">
 <AlertDialogCancel className="rounded-lg h-14 px-10 border-border/20 font-semibold text-sm tracking-widest">Cancel</AlertDialogCancel>
 <AlertDialogAction className="rounded-lg h-14 px-12 bg-red-600 hover:bg-red-700 shadow-xl shadow-red-600/20 font-semibold text-sm tracking-widest" onClick={onConfirm}>
 Yes, Delete
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 );
};

export default UserDeleteDialog;
