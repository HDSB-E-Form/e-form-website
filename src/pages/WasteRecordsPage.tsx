import { useState, useMemo } from "react";
import { useSubmissions, type Submission } from "@/contexts/SubmissionsContext";
import { ArrowLeft, Image as ImageIcon, XCircle, Search, Clock, Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { renderValue } from "@/components/DataRenderer";
import logo from "@/assets/logo.png";

const WasteRecordsPage = () => {
    const navigate = useNavigate();
    const { submissions } = useSubmissions();
    const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [search, setSearch] = useState("");
    const [isViewAll, setIsViewAll] = useState(false);

    const wasteSubmissions = useMemo(() => 
        submissions
            .filter(s => s.formType === "waste_inventory")
            .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
    [submissions]);

    const refNoMap = useMemo(() => {
        const map = new Map<string, string>();
        const safetyForms = submissions
            .filter(s => ["waste_inventory", "mixing_chemical_stages", "final_discharge", "daily_operation_monitoring"].includes(s.formType))
            .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
            
        safetyForms.forEach((s, idx) => {
            map.set(s.id, `SFTY-${String(idx + 1).padStart(5, "0")}`);
        });
        return map;
    }, [submissions]);

    const generateRefNo = (subId: string) => {
        return refNoMap.get(subId) || `SFTY-${subId.replace(/\D/g, "").slice(0, 5).padStart(5, "0")}`;
    };

    const filteredWasteSubmissions = useMemo(() => {
        return wasteSubmissions.filter(sub => {
            if (!search) return true;
            const q = search.toLowerCase();
            const dateStr = new Date(sub.submittedAt).toLocaleDateString("en-CA");
            return (sub.employeeName || '').toLowerCase().includes(q) ||
                   (sub.data.wasteType || '').toLowerCase().includes(q) ||
                   (sub.data.plant || '').toLowerCase().includes(q) ||
                   (sub.data.category || '').toLowerCase().includes(q) ||
                   dateStr.includes(q) ||
                   generateRefNo(sub.id).toLowerCase().includes(q);
        });
    }, [wasteSubmissions, search]);

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Fullscreen Image Preview Modal */}
            {fullscreenImage && (
                <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setFullscreenImage(null)}>
                    <button onClick={() => setFullscreenImage(null)} className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full bg-black/50 transition-colors">
                        <XCircle className="h-8 w-8" />
                    </button>
                    <img src={fullscreenImage} alt="Waste fullscreen preview" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
                </div>
            )}

            {selectedSubmission ? (
                <>
                <div className="p-6 lg:p-8 max-w-5xl mx-auto print:absolute print:inset-0 print:max-w-none print:w-full print:bg-white print:text-black print:z-50 print:p-8 print:m-0 animate-in fade-in-5">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6 print:hidden">
                        <button onClick={() => setSelectedSubmission(null)} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all group">
                            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Records
                        </button>
                        <button onClick={() => {
                            const originalTitle = document.title;
                            document.title = generateRefNo(selectedSubmission.id);

                            const isDark = document.documentElement.classList.contains('dark');
                            if (isDark) document.documentElement.classList.remove('dark');

                            setTimeout(() => {
                                window.onafterprint = () => {
                                    document.title = originalTitle;
                                    if (isDark) document.documentElement.classList.add('dark');
                                    window.onafterprint = null;
                                };
                                window.print();
                                setTimeout(() => { document.title = originalTitle; }, 2000);
                            }, 50);
                        }} className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-foreground bg-muted hover:bg-muted/80 border border-border rounded-lg transition-all shadow-sm">
                            <Printer className="h-4 w-4" /> Print
                        </button>
                    </div>

                    {/* Print Header */}
                    <div className="hidden print:flex items-start justify-between mb-8 border-b-2 border-black pb-6">
                        <div className="flex items-center">
                            <img src={logo} alt="HICOM Diecasting" className="h-14 w-auto object-contain mr-6" />
                            <div className="text-left">
                                <h1 className="text-2xl font-bold uppercase tracking-widest text-black">HICOM Diecastings Sdn Bhd</h1>
                                <p className="text-sm text-gray-600 mt-1 uppercase tracking-wide">Scheduled Waste Inventory Record</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500">Printed On:</p>
                            <p className="text-sm font-semibold text-black">{new Date().toLocaleString('en-GB')}</p>
                        </div>
                    </div>

                    <div className="card-elevated p-4 sm:p-6 print:border-none print:shadow-none print:p-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:mb-8">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold text-foreground print:text-black">
                                    Scheduled Waste Record
                                </h2>
                                <p className="text-xs sm:text-sm text-muted-foreground print:text-gray-600 mt-1">Ref: {generateRefNo(selectedSubmission.id)}</p>
                            </div>
                            <div className="print:hidden">
                                <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-0 text-xs font-medium px-3 py-1">Recorded</Badge>
                            </div>
                        </div>

                        <div className="mb-8">
                            <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                                <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Submitted By</span>
                                <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.employeeName || "—"}</div>
                            </div>
                            <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                                <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Record Date & Time</span>
                                <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">
                                    {new Date(selectedSubmission.data.recordDate || selectedSubmission.submittedAt).toLocaleDateString('en-GB')} at {selectedSubmission.data.recordTime || new Date(selectedSubmission.submittedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                            <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                                <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Plant</span>
                                <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.plant || "—"}</div>
                            </div>
                            <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                                <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Category</span>
                                <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2 capitalize">{selectedSubmission.data.category === 'sell' ? 'Recycle' : selectedSubmission.data.category === 'pay' ? 'Dispose' : "—"}</div>
                            </div>
                            <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                                <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Waste Type</span>
                                <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.wasteType || "—"}</div>
                            </div>
                            <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                                <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Total Gross Weight</span>
                                <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.totals?.gross.toFixed(2) || '0.00'} kg</div>
                            </div>
                            <div className="py-2 sm:py-4 border-b border-border print:border-gray-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                                <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Total Container Weight</span>
                                <div className="text-xs sm:text-sm font-medium text-foreground print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.totals?.container.toFixed(2) || '0.00'} kg</div>
                            </div>
                            <div className="py-2 sm:py-4 border-b-0 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-1 sm:gap-4 items-start">
                                <span className="text-xs sm:text-sm text-primary print:text-gray-500 uppercase tracking-wider font-bold mt-0.5">Total Net Weight</span>
                                <div className="text-lg font-bold text-primary print:text-black text-left break-words sm:col-span-2 print:col-span-2">{selectedSubmission.data.totals?.net.toFixed(2) || '0.00'} kg</div>
                            </div>
                        </div>

                        {selectedSubmission.data.remarks && (
                            <div className="p-4 rounded-xl border mb-6 print:bg-white bg-blue-500/10 border-blue-500/20 text-blue-800 dark:text-blue-300">
                                <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80 print:text-gray-500">Remarks / Ulasan</p>
                                <p className="text-sm font-medium print:text-black">"{selectedSubmission.data.remarks}"</p>
                            </div>
                        )}

                        <div className="mt-4">
                            {(selectedSubmission.data.rows || []).filter((r: any) => r.imageUrl).length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                    {(selectedSubmission.data.rows || []).filter((r: any) => r.imageUrl).map((r: any, idx: number) => (
                                        <div key={idx} className="aspect-square rounded-lg bg-muted border border-border overflow-hidden cursor-pointer group" onClick={() => setFullscreenImage(r.imageUrl)}>
                                            <img src={r.imageUrl} alt={`Record ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 text-sm text-muted-foreground flex flex-col items-center gap-2">
                                    <ImageIcon className="h-6 w-6 opacity-50" />
                                    No images were uploaded for this record.
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Print Footer */}
                    <div className="hidden print:block mt-12 text-center text-xs text-gray-400">
                        <p>This is computer generated and no signature is required.</p>
                    </div>
                </div>
                </>
            ) : (
                <>
                    <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all mb-6 group">
                        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
                    </button>

                    <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Scheduled Waste Records</h1>
                            <p className="text-muted-foreground text-sm mt-1">Browse all submitted waste inventory records and view attached images.</p>
                        </div>
                        <div className="relative w-[6cm] shrink-0"> {/* Fixed width for search input */}
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search records..."
                                value={search}
                                onChange={e => { setSearch(e.target.value); setIsViewAll(false); }}
                                className="pl-9 pr-9 w-full h-9 text-sm"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full transition-colors"
                                    title="Clear search"
                                >
                                    <XCircle className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {filteredWasteSubmissions.length === 0 ? (
                        <div className="card-elevated p-12 text-center">
                            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-foreground">No waste inventory records found.</h3>
                        </div>
                    ) : (
                        <div className="card-elevated overflow-hidden">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30">
                                            <TableHead className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Ref No.</TableHead>
                                            <TableHead className="text-xs font-bold uppercase tracking-wider">Submitted By</TableHead>
                                            <TableHead className="text-xs font-bold uppercase tracking-wider">Waste Type</TableHead>
                                            <TableHead className="text-xs font-bold uppercase tracking-wider">Date</TableHead>
                                            <TableHead className="text-xs font-bold uppercase tracking-wider">Plant</TableHead>
                                            <TableHead className="text-xs font-bold uppercase tracking-wider">Category</TableHead>
                                            <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(isViewAll ? filteredWasteSubmissions : filteredWasteSubmissions.slice(0, 10)).map(sub => (
                                            <TableRow key={sub.id} className="hover:bg-muted/20">
                                                <TableCell className="font-medium text-primary text-sm whitespace-nowrap">{generateRefNo(sub.id)}</TableCell>
                                                <TableCell className="text-sm text-foreground">{sub.employeeName}</TableCell>
                                                <TableCell className="text-sm text-foreground">{sub.data.wasteType}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{new Date(sub.data.recordDate || sub.submittedAt).toLocaleDateString('en-GB')}</TableCell>
                                                <TableCell className="text-sm text-foreground">{sub.data.plant}</TableCell>
                                                <TableCell className="text-sm text-foreground capitalize">{sub.data.category === 'sell' ? 'Recycle' : sub.data.category === 'pay' ? 'Dispose' : "—"}</TableCell>
                                                <TableCell className="text-center">
                                                    <button onClick={() => setSelectedSubmission(sub)} className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors whitespace-nowrap">
                                                        View Details
                                                    </button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border">
                                <p className="text-sm text-muted-foreground">Showing {Math.min(filteredWasteSubmissions.length, isViewAll ? filteredWasteSubmissions.length : 10)} of {filteredWasteSubmissions.length} records</p>
                                {filteredWasteSubmissions.length > 10 && (
                                    <button
                                        onClick={() => setIsViewAll(!isViewAll)}
                                        className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm"
                                    >
                                        {isViewAll ? "View Less" : "View More"}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default WasteRecordsPage;