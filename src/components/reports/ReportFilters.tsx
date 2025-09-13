
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface FilterOptions {
    drivers: { id: string; name: string }[];
    branches: { id: number; name: string }[];
}

const ALL_FILTER_VALUE = "_all_";

const reportFiltersSchemaBase = z.object({
    reportType: z.string().min(1, { message: "الرجاء اختيار نوع التقرير." }),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    driverId: z.string().optional(),
    branchId: z.string().optional(),
});

// Refine function needs access to the form instance to set errors
let formInstance: any;

const reportFiltersSchema = reportFiltersSchemaBase.refine(data => {
    const reportRequiresDates = ['parcels_by_status', 'branch_activity', 'driver_performance', 'financial_summary'].includes(data.reportType);
    if (reportRequiresDates && (!data.startDate || !data.endDate)) {
        if (formInstance) { // Check if formInstance is available
            if (!data.startDate) {
                formInstance.setError("startDate", { type: "manual", message: "تاريخ البدء مطلوب لهذا التقرير." });
            }
            if (!data.endDate) {
                formInstance.setError("endDate", { type: "manual", message: "تاريخ الانتهاء مطلوب لهذا التقرير." });
            }
        }
        return false;
    }
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
        if (formInstance) {
            formInstance.setError("endDate", { type: "manual", message: "تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء." });
        }
        return false;
    }
    return true;
}, {
    // This path is a fallback if refine fails for a non-specific reason, not ideal for field-specific errors.
    // Field-specific errors are better set directly using form.setError.
    path: ["endDate"],
    message: "فترة التاريخ غير صالحة أو ناقصة لنوع التقرير المختار."
});


type ReportFiltersValues = z.infer<typeof reportFiltersSchema>;

interface ReportFiltersProps {
    onApplyFilters: (filters: ReportFiltersValues) => void;
    filterOptions: FilterOptions;
    isLoading: boolean;
}

export function ReportFilters({ onApplyFilters, filterOptions, isLoading }: ReportFiltersProps) {
    const form = useForm<ReportFiltersValues>({
        resolver: zodResolver(reportFiltersSchema),
        defaultValues: {
            reportType: "",
            driverId: ALL_FILTER_VALUE,
            branchId: ALL_FILTER_VALUE,
            startDate: undefined,
            endDate: undefined,
        },
        // Set the form instance for the refine function
        // @ts-ignore
        context: { setError: (name, error) => form.setError(name, error) }
    });
    formInstance = form; // Assign the form instance to the outer scope variable

    function onSubmit(data: ReportFiltersValues) {
        form.clearErrors(["startDate", "endDate"]); // Clear previous errors
        onApplyFilters(data);
    }

    const reportTypes = [
        { value: "parcels_by_status", label: "تقرير الطرود حسب الحالة" },
        { value: "branch_activity", label: "تقرير نشاط الفرع" },
        { value: "driver_performance", label: "تقرير أداء السائقين" },
        { value: "financial_summary", label: "ملخص مالي" },
        { value: "expenses_report", label: "تقرير المصروفات" },
        // Add other report types here if needed
    ];

    const currentReportType = form.watch("reportType");
    const reportRequiresDates = ['parcels_by_status', 'branch_activity', 'driver_performance', 'financial_summary', 'expenses_report'].includes(currentReportType);
    const reportAllowsBranchFilter = ['branch_activity', 'financial_summary', 'expenses_report', 'parcels_by_status'].includes(currentReportType);
    const reportAllowsDriverFilter = ['driver_performance'].includes(currentReportType);


    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="reportType"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>نوع التقرير</FormLabel>
                            <Select
                                onValueChange={(value) => {
                                    field.onChange(value);
                                    // Reset optional fields if they are not applicable to the new report type
                                    if (!['branch_activity', 'financial_summary', 'expenses_report'].includes(value)) {
                                        form.setValue('branchId', ALL_FILTER_VALUE);
                                    }
                                    if (!['driver_performance'].includes(value)) {
                                        form.setValue('driverId', ALL_FILTER_VALUE);
                                    }
                                    if (!['parcels_by_status', 'branch_activity', 'driver_performance', 'financial_summary', 'expenses_report'].includes(value)) {
                                        form.setValue('startDate', undefined);
                                        form.setValue('endDate', undefined);
                                        form.clearErrors(['startDate', 'endDate']);
                                    }
                                }}
                                defaultValue={field.value}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="اختر نوع التقرير" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {reportTypes.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {(reportRequiresDates) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="startDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>تاريخ البدء</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? format(field.value, "PPP", { locale: arSA }) : <span>اختر تاريخًا</span>}
                                                    <CalendarIcon className="me-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                initialFocus
                                                locale={arSA}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="endDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>تاريخ الانتهاء</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? format(field.value, "PPP", { locale: arSA }) : <span>اختر تاريخًا</span>}
                                                    <CalendarIcon className="me-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                initialFocus
                                                locale={arSA}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reportAllowsBranchFilter && (
                        <FormField
                            control={form.control}
                            name="branchId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>الفرع</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="اختر فرعًا (الكل افتراضي)" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value={ALL_FILTER_VALUE}>الكل</SelectItem>
                                            {filterOptions.branches.map((branch) => (
                                                <SelectItem key={branch.id} value={branch.id.toString()}>
                                                    {branch.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                    {reportAllowsDriverFilter && (
                        <FormField
                            control={form.control}
                            name="driverId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>السائق</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="اختر سائقًا (الكل افتراضي)" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value={ALL_FILTER_VALUE}>الكل</SelectItem>
                                            {filterOptions.drivers.map((driver) => (
                                                <SelectItem key={driver.id} value={driver.id}>
                                                    {driver.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                </div>
                <Button type="submit" disabled={isLoading || !currentReportType} className="w-full sm:w-auto">
                    {isLoading ? (
                        <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    ) : (
                        "إنشاء التقرير"
                    )}
                </Button>
            </form>
        </Form>
    );
}
