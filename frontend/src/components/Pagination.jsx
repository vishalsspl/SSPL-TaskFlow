import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const Pagination = ({ meta, onPageChange }) => {
    if (!meta || meta.totalPages <= 1) return null;

    const { totalPages, page } = meta;

    return (
        <div className="flex items-center justify-center space-x-6 py-6">
            <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all duration-200"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
            >
                <ChevronLeft className="h-5 w-5" />
            </Button>

            <div className="flex items-center px-4 py-2 rounded-xl bg-white/5 border border-white/10 shadow-lg">
                <span className="text-sm font-black Montserrat text-primary">
                    {page}
                </span>
            </div>

            <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all duration-200"
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages}
            >
                <ChevronRight className="h-5 w-5" />
            </Button>
        </div>
    );
};

export default Pagination;
