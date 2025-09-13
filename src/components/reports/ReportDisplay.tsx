
"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, TrendingUp, TrendingDown, DollarSign, CreditCard, FileText, Users } from 'lucide-react';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface ReportData {
    type: 'table' | 'chart' | 'text' | 'financial_summary' | 'driver_performance_summary';
    data: any;
    options?: any;
    title?: string;
    description?: string;
}

interface ReportDisplayProps {
    reportData: ReportData | null;
}

const formatCurrencyYERForDisplay = (value: string | number | undefined | null) => {
    if (typeof value === 'string' && value.includes('ر.ي')) return value; // Already formatted
    const num = Number(value);
    if (value === undefined || value === null || isNaN(num)) return 'غير متوفر';
    return new Intl.NumberFormat('ar-YE', { style: 'currency', currency: 'YER', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
};


const ReportDisplay: React.FC<ReportDisplayProps> = ({ reportData }) => {
    if (!reportData) {
        return null;
    }

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            const reportContent = document.getElementById('printable-report-area');
            if (reportContent) {
                const systemName = typeof window !== 'undefined' ? localStorage.getItem('SystemName') || "جلوبال تراك" : "جلوبال تراك";
                const logoUrl = typeof window !== 'undefined' ? localStorage.getItem('SystemLogo') || "" : "";

                let headerHtml = `<div style="text-align: center; margin-bottom: 20px;">`;
                if (logoUrl) {
                    headerHtml += `<img src="${logoUrl}" alt="Company Logo" style="max-height: 50px; margin-bottom: 10px;" />`;
                }
                headerHtml += `<h1 style="font-size: 1.5em; margin-bottom: 5px;">${systemName}</h1>`;
                headerHtml += `<h2 style="font-size: 1.2em; margin-bottom: 5px;">${reportData.title || 'تقرير'}</h2>`;
                if (reportData.description) {
                    headerHtml += `<p style="font-size: 0.9em; color: #555;">${reportData.description}</p>`;
                }
                headerHtml += `</div>`;

                const footerHtml = `<div style="text-align: center; margin-top: 30px; font-size: 0.8em; color: #777; border-top: 1px solid #eee; padding-top: 10px;">
                            <p>تاريخ الطباعة: ${format(new Date(), "PPpp", { locale: arSA })}</p>
                            <p>&copy; ${new Date().getFullYear()} ${systemName}. جميع الحقوق محفوظة.</p>
                          </div>`;

                printWindow.document.write('<html><head><title>طباعة التقرير</title>');
                // Copy styles
                Array.from(document.styleSheets).forEach(styleSheet => {
                    try {
                        const cssRules = Array.from(styleSheet.cssRules).map(rule => rule.cssText).join('\n');
                        printWindow.document.write(`<style>${cssRules}</style>`);
                    } catch (e) {
                        if (styleSheet.href) {
                            printWindow.document.write(`<link rel="stylesheet" href="${styleSheet.href}">`);
                        }
                    }
                });
                printWindow.document.write(`
            <style>
                body { font-family: sans-serif; margin: 20px; direction: rtl; background-color: white !important; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;}
                .print-hide { display: none !important; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                th { background-color: #f2f2f2; }
                .report-card { border: 1px solid #ccc; padding: 15px; margin-bottom: 15px; }
                .report-stat-card { border: 1px solid #eee; padding: 10px; text-align: center; }
                .grid { display: grid; gap: 1rem; }
                .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
                .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
                .md\:grid-cols-3 { @media (min-width: 768px) { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
                .text-lg { font-size: 1.125rem; }
                .font-semibold { font-weight: 600; }
                .text-muted-foreground { color: #6b7280; } /* Example color */
                .text-primary { color: var(--primary); } /* Ensure primary color is defined for print */
                .text-green-600 { color: #059669; }
                .text-red-600 { color: #dc2626; }
                .space-y-2 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.5rem; }
            </style>
        `);
                printWindow.document.write('</head><body>');
                printWindow.document.write(headerHtml);
                printWindow.document.write(reportContent.innerHTML);
                printWindow.document.write(footerHtml);
                printWindow.document.write('</body></html>');
                printWindow.document.close();

                setTimeout(() => { // Ensure content is loaded before print dialog
                    printWindow.focus();
                    printWindow.print();
                    // printWindow.close(); // Some browsers close automatically, others don't.
                }, 500);
            }
        }
    };

    const renderTableReport = (tableData: { headers: string[]; rows: (string | number)[][]; caption?: string }) => {
        if (!tableData || !tableData.headers || !tableData.rows) {
            return <p className="text-center text-muted-foreground">بيانات التقرير غير صالحة للعرض كجدول.</p>;
        }
        return (
            <div className="overflow-x-auto">
                <Table>
                    {tableData.caption && <TableCaption>{tableData.caption}</TableCaption>}
                    <TableHeader>
                        <TableRow>
                            {tableData.headers.map((header, index) => (
                                <TableHead key={index}>{header}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tableData.rows.length > 0 ? tableData.rows.map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                                {row.map((cell, cellIndex) => (
                                    <TableCell key={cellIndex}>{cellIndex === 1 && tableData.headers[cellIndex]?.toLowerCase().includes('مبلغ') ? formatCurrencyYERForDisplay(cell as number) : cell}</TableCell>
                                ))}
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={tableData.headers.length} className="text-center text-muted-foreground">
                                    لا توجد بيانات لعرضها تطابق معايير البحث.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        );
    };

    const renderFinancialSummaryReport = (summaryData: {
        period: string;
        branchName?: string;
        totalRevenue: string;
        totalParcelTaxes: string;
        totalParcelCommissions: string;
        totalOperationalExpenses: string;
        netProfit: string;
        profitStatus: 'ربح' | 'خسارة';
    }) => {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="report-stat-card">
                        <CardHeader className="p-2 pb-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><DollarSign size={16} /> إجمالي الإيرادات</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2">
                            <p className="text-2xl font-bold text-primary">{summaryData.totalRevenue}</p>
                        </CardContent>
                    </Card>
                    <Card className="report-stat-card">
                        <CardHeader className="p-2 pb-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><FileText size={16} /> إجمالي ضرائب الطرود</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2">
                            <p className="text-xl font-bold">{summaryData.totalParcelTaxes}</p>
                        </CardContent>
                    </Card>
                    <Card className="report-stat-card">
                        <CardHeader className="p-2 pb-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Users size={16} /> إجمالي عمولات الطرود</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2">
                            <p className="text-xl font-bold">{summaryData.totalParcelCommissions}</p>
                        </CardContent>
                    </Card>
                    <Card className="report-stat-card">
                        <CardHeader className="p-2 pb-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><CreditCard size={16} /> إجمالي المصروفات</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2">
                            <p className="text-2xl font-bold text-red-600">{summaryData.totalOperationalExpenses}</p>
                        </CardContent>
                    </Card>
                    <Card className={`report-stat-card md:col-span-2 ${summaryData.profitStatus === 'ربح' ? 'bg-green-50' : 'bg-red-50'}`}>
                        <CardHeader className="p-2 pb-0">
                            <CardTitle className={`text-sm font-medium flex items-center gap-1 ${summaryData.profitStatus === 'ربح' ? 'text-green-700' : 'text-red-700'}`}>
                                {summaryData.profitStatus === 'ربح' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                صافي الربح / الخسارة
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2">
                            <p className={`text-3xl font-bold ${summaryData.profitStatus === 'ربح' ? 'text-green-600' : 'text-red-600'}`}>
                                {summaryData.netProfit}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    };

    const renderDriverPerformanceSummary = (performanceData: Array<{
        driverName: string;
        driverId: string;
        manifestsAssigned: number;
        parcelsDelivered: number;
        codCollected: string;
    }>) => {
        return (
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>اسم السائق</TableHead>
                            <TableHead>معرف السائق</TableHead>
                            <TableHead className="text-center">الكشوفات المسندة</TableHead>
                            <TableHead className="text-center">الطرود المسلمة</TableHead>
                            <TableHead>إجمالي المحصل (COD)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {performanceData.length > 0 ? performanceData.map(driver => (
                            <TableRow key={driver.driverId}>
                                <TableCell className="font-medium">{driver.driverName}</TableCell>
                                <TableCell>{driver.driverId}</TableCell>
                                <TableCell className="text-center">{driver.manifestsAssigned}</TableCell>
                                <TableCell className="text-center">{driver.parcelsDelivered}</TableCell>
                                <TableCell>{driver.codCollected}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground">
                                    لا توجد بيانات أداء سائقين لعرضها تطابق الفلترة.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        )
    };


    const renderReportContent = () => {
        switch (reportData.type) {
            case 'table':
                return renderTableReport(reportData.data);
            case 'financial_summary':
                return renderFinancialSummaryReport(reportData.data);
            case 'driver_performance_summary':
                return renderDriverPerformanceSummary(reportData.data);
            case 'text':
                return <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">{reportData.data as string}</div>;
            default:
                return <p className="text-center text-destructive">نوع التقرير غير مدعوم أو بيانات غير صالحة.</p>;
        }
    };

    return (
        <Card className="shadow-lg rounded-lg">
            <CardHeader className="flex flex-row justify-between items-center print-hide">
                <div>
                    <CardTitle>{reportData.title || "نتائج التقرير"}</CardTitle>
                    {reportData.description && <CardDescription>{reportData.description}</CardDescription>}
                </div>
                <Button onClick={handlePrint} variant="outline">
                    <Printer className="me-2 h-4 w-4" />
                    طباعة التقرير
                </Button>
            </CardHeader>
            <CardContent id="printable-report-area">
                {/* This div is what gets printed */}
                {renderReportContent()}
            </CardContent>
        </Card>
    );
};

export default ReportDisplay;
