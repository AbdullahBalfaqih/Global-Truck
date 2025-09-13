'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { getAllBranches } from "@/actions/branches";
import { getAllExpenses, createExpense } from "@/actions/expenses";
import type { Expense as ExpenseType, Branch as BranchType } from '@/types';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { arSA } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formatCurrencyYER = (value: number) => {
    return new Intl.NumberFormat('ar-YE', { style: 'currency', currency: 'YER' }).format(value);
};

const NO_BRANCH_SELECTED_VALUE = "_no_branch_";

const ExpensesPage: React.FC = () => {
    const [expenses, setExpenses] = useState<ExpenseType[]>([]);
    const [newExpense, setNewExpense] = useState<{
        Description: string;
        Amount: number;
        DateSpent: Date | undefined;
        BranchID?: number | null;
    }>({
        Description: '',
        Amount: 0,
        DateSpent: new Date(),
        BranchID: undefined,
    });
    const [allBranches, setAllBranches] = useState<BranchType[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [fetchedBranches, fetchedExpenses] = await Promise.all([
                    getAllBranches(),
                    getAllExpenses(),
                ]);
                setAllBranches(fetchedBranches);
                setExpenses(fetchedExpenses);
            } catch (error) {
                toast({
                    title: 'خطأ',
                    description: 'فشل في تحميل البيانات.',
                    variant: 'destructive',
                });
            }
        };
        fetchData();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setNewExpense((prev) => ({
            ...prev,
            [name]: name === 'Amount' ? parseFloat(value) : value,
        }));
    };

    const handleDateChange = (date: Date | undefined) => {
        setNewExpense(prev => ({ ...prev, DateSpent: date }));
    };

    const handleBranchChange = (branchIdString: string) => {
        if (branchIdString === NO_BRANCH_SELECTED_VALUE) {
            setNewExpense(prev => ({ ...prev, BranchID: null }));
        } else {
            setNewExpense(prev => ({ ...prev, BranchID: parseInt(branchIdString, 10) }));
        }
    };

    const handleAddExpense = async () => {
        if (!newExpense.Description || !newExpense.Amount || !newExpense.DateSpent) {
            toast({
                title: 'خطأ',
                description: 'الرجاء تعبئة حقول الوصف، المبلغ، والتاريخ.',
                variant: 'destructive',
            });
            return;
        }
        if (newExpense.Amount <= 0) {
            toast({
                title: 'خطأ',
                description: 'المبلغ يجب أن يكون أكبر من صفر.',
                variant: 'destructive',
            });
            return;
        }

        try {
            // بناء FormData لإرسالها
            const formData = new FormData();
            formData.append('Description', newExpense.Description);
            formData.append('Amount', newExpense.Amount.toString());
            formData.append('DateSpent', newExpense.DateSpent.toISOString());
            formData.append('BranchID', newExpense.BranchID?.toString() || '');

            const prevState = {}; // Placeholder for previous state

            const response = await createExpense(prevState, formData); // Call the API to create the expense

            if (response.success) {
                const addedExpense: ExpenseType = {
                    ExpenseID: Math.floor(Math.random() * 10000), // Temporary ID, replace with actual ID from DB
                    Description: newExpense.Description,
                    Amount: newExpense.Amount,
                    DateSpent: format(newExpense.DateSpent, 'yyyy-MM-dd'),
                    BranchID: newExpense.BranchID,
                    AddedByUserID: 1, // Replace with actual user ID
                    AddedByUserName: "المستخدم الحالي", // Replace with actual user name
                    CreatedAt: new Date().toISOString()
                };

                setExpenses((prev) => [...prev, addedExpense]);
                setNewExpense({ Description: '', Amount: 0, DateSpent: new Date(), BranchID: undefined });
                toast({
                    title: 'نجاح',
                    description: 'تمت إضافة المصروف بنجاح.',
                });
            } else {
                toast({
                    title: 'خطأ',
                    description: response.message,
                    variant: 'destructive',
                });
            }
        } catch (error: any) {
            toast({
                title: 'خطأ',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    const getBranchName = (branchId: number | undefined | null): string => {
        if (!branchId) return 'غير محدد';
        const branch = allBranches.find(b => b.BranchID === branchId);
        return branch ? `${branch.Name} (${branch.City})` : `فرع غير معروف (${branchId})`;
    };

    return (
        <div className="flex flex-col gap-6 p-6">
            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle>إضافة مصروف جديد</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="Description">الوصف  </Label>
                        <Textarea
                            id="Description"
                            name="Description"
                            value={newExpense.Description}
                            onChange={handleInputChange}
                            placeholder="أدخل وصف المصروف"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="Amount">المبلغ   (ريال يمني)</Label>
                        <Input
                            id="Amount"
                            name="Amount"
                            type="number"
                            value={newExpense.Amount <= 0 ? '' : newExpense.Amount}
                            onChange={handleInputChange}
                            placeholder="مثال: 5000"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="DateSpent">التاريخ  </Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !newExpense.DateSpent && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="me-2 h-4 w-4" />
                                    {newExpense.DateSpent ? format(newExpense.DateSpent, "PPP", { locale: arSA }) : <span>اختر تاريخًا</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={newExpense.DateSpent}
                                    onSelect={handleDateChange}
                                    initialFocus
                                    locale={arSA}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="BranchID">الفرع  </Label>
                        <Select
                            value={newExpense.BranchID?.toString() || NO_BRANCH_SELECTED_VALUE}
                            onValueChange={handleBranchChange}
                        >
                            <SelectTrigger id="BranchID">
                                <SelectValue placeholder="اختر الفرع (اختياري)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NO_BRANCH_SELECTED_VALUE}>غير محدد</SelectItem>
                                {allBranches.map((branch) => (
                                    <SelectItem key={branch.BranchID} value={branch.BranchID.toString()}>
                                        {branch.Name} ({branch.City})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-end md:col-span-2">
                        <Button onClick={handleAddExpense} className="w-full md:w-auto">إضافة مصروف</Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle className="text-center">قائمة المصروفات</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-primary text-primary-foreground"> 
                                <TableRow>
                                  
                                    <TableHead className="text-center bg-primary text-primary-foreground">الوصف  </TableHead>
                                    <TableHead className="text-center bg-primary text-primary-foreground">المبلغ  </TableHead>
                                    <TableHead className="text-center bg-primary text-primary-foreground">التاريخ </TableHead>
                                    <TableHead className="text-center bg-primary text-primary-foreground">الفرع  </TableHead>
                                    <TableHead className="text-center bg-primary text-primary-foreground">أضيف بواسطة  </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expenses.map((expense) => (
                                    <TableRow key={expense.ExpenseID}>
                                        <TableCell className="text-center">{expense.Description}</TableCell>
                                        <TableCell className="text-center">{formatCurrencyYER(expense.Amount)}</TableCell>
                                        <TableCell className="text-center">{format(new Date(expense.DateSpent), "PPP", { locale: arSA })}</TableCell>
                                        <TableCell className="text-center">{getBranchName(expense.BranchID)}</TableCell>
                                        <TableCell className="text-center">{expense.AddedByUserName || '-'}</TableCell>
                                    </TableRow>
                                ))}
                                {expenses.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground">لا توجد مصروفات لعرضها.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ExpensesPage;