
"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit3, Trash2, ExternalLink } from 'lucide-react';
import type { Branch } from '@/types';
import Link from 'next/link';

interface BranchesTableProps {
  branches: Branch[];
  onEditClick: (branch: Branch) => void;
  onDeleteClick: (branch: Branch) => void;
}

export function BranchesTable({ branches, onEditClick, onDeleteClick }: BranchesTableProps) {
  if (!branches || branches.length === 0) {
    return <p className="text-center text-muted-foreground py-4">لا توجد فروع لعرضها حاليًا.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
          <TableHeader className="bg-primary text-primary-foreground">
                    {/* CRITICAL FIX: Ensure <TableRow> immediately follows <TableHeader> without any whitespace */}
                    <TableRow>
                        <TableHead className="text-center text-primary-foreground">اسم الفرع</TableHead>
                        <TableHead className="text-center text-primary-foreground">المدينة</TableHead>
                        <TableHead className="text-center text-primary-foreground">العنوان</TableHead>
                        <TableHead className="text-center text-primary-foreground">رقم الهاتف</TableHead>
                        <TableHead className="text-center text-primary-foreground">رابط الخريطة</TableHead>
                        <TableHead className="text-center text-primary-foreground">إجراءات</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {branches.map((branch) => (
                        <TableRow key={branch.BranchID}>
                            {/* CRITICAL FIX: Ensure <TableCell> immediately follows <TableRow> without any whitespace */}
                            <TableCell className="text-center font-medium">{branch.Name}</TableCell>
                            <TableCell className="text-center">{branch.City}</TableCell>
                            <TableCell className="text-center">{branch.Address}</TableCell>
                            <TableCell className="text-center">{branch.Phone}</TableCell>
                            <TableCell className="text-center">{branch.GoogleMapsLink}</TableCell>
                            <TableCell className="text-center">
                                <div className="flex justify-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        title="تعديل"
                                        onClick={() => onEditClick?.(branch)}
                                    >
                                        <Edit3 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        title="حذف"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => onDeleteClick?.(branch)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
