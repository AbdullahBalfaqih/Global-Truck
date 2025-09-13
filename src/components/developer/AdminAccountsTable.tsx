
"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AdminAccount {
  id: string; 
  username: string;
  // Note: Password is NOT included here for security
}

interface AdminAccountsTableProps {
  adminAccounts: AdminAccount[];
}

export const AdminAccountsTable: React.FC<AdminAccountsTableProps> = ({ adminAccounts }) => {
  // Access control should be handled by the parent DeveloperPage

  if (adminAccounts.length === 0) {
    return <p className="text-center text-muted-foreground py-4">لا توجد حسابات مدراء لعرضها حاليًا.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>معرف الحساب</TableHead>
          <TableHead>اسم مستخدم المدير</TableHead>
          {/* Add more headers if needed, but NEVER for passwords */}
        </TableRow>
      </TableHeader>
      <TableBody>
        {adminAccounts.map((account) => (
          <TableRow key={account.id}>
            <TableCell className="font-mono">{account.id}</TableCell>
            <TableCell>{account.username}</TableCell>
            {/* Add more cells for other admin account details if needed */}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
