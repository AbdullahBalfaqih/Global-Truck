
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Truck, LayoutDashboard, PackageSearch, Map, Users, CreditCard, UserCog, Settings as SettingsIconLucideReal, PackagePlus, ListOrdered, Building, FileText as BarChartIcon, MapPinned, ClipboardList, ListChecks, Briefcase, DollarSign, ShieldCheck, TrendingUp, PackageCheck, StickyNote, DatabaseBackup, HandCoins, ArrowUpLeftFromCircle, ArrowDownRightFromCircle, Banknote, Wallet, Coins, Route, Search } from "lucide-react";
import {
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
  SidebarMenuSub,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

const navItemsBase = [
  { href: "/dashboard", icon: LayoutDashboard, label: "لوحة التحكم", tooltip: "لوحة التحكم", roles: ['Admin', 'BranchEmployee', 'Developer'] },
  // Parcel items will be handled separately in dropdowns
  { href: "/operations", icon: ClipboardList, label: "العمليات", tooltip: "إدارة عمليات التوصيل", roles: ['Admin', 'BranchEmployee', 'Developer'] },
  { href: "/tasks", icon: ListChecks, label: "المهام", tooltip: "مهام السائقين", roles: ['Admin', 'BranchEmployee', 'Developer'] },
  { href: "/route-map", icon: Map, label: "خريطة المسار", tooltip: "خريطة تفاعلية", roles: ['Admin', 'Developer'] },
  { href: "/branches", icon: Building, label: "إدارة الفروع", tooltip: "إدارة بيانات الفروع", roles: ['Admin', 'Developer'] },
  { href: "/delivery-cities", icon: MapPinned, label: "مدن التوصيل", tooltip: "إدارة مدن التوصيل", roles: ['Admin', 'Developer'] },
  { href: "/employees", icon: Briefcase, label: "الموظفين", tooltip: "إدارة شؤون الموظفين", roles: ['Admin', 'Developer'] },
  { href: "/drivers", icon: UserCog, label: "إدارة السائقين", tooltip: "إدارة بيانات السائقين", roles: ['Admin', 'Developer'] },
  { href: "/users", icon: Users, label: "إدارة المستخدمين", tooltip: "إدارة مستخدمي النظام", roles: ['Admin', 'Developer'] },
  { href: "/reports", icon: BarChartIcon, label: "التقارير", tooltip: "إنشاء وعرض التقارير", roles: ['Admin', 'Developer'] },
];

const sentParcelsSubMenu = [
    { href: "/parcels/add", icon: PackagePlus, label: "إضافة طرد", roles: ['Admin', 'BranchEmployee', 'Developer'] },
    { href: "/parcels/list", icon: ListOrdered, label: "قائمة الطرود", roles: ['Admin', 'BranchEmployee', 'Developer'] },
];

const receivedParcelsSubMenu = [
    { href: "/parcels/search", icon: PackageSearch, label: "بحث الطرود", roles: ['Admin', 'BranchEmployee', 'Developer'] },
    { href: "/parcels/pickup", icon: PackageCheck, label: "استلام الطرود", roles: ['Admin', 'BranchEmployee', 'Developer'] },
];

const financialsSubMenu = [
    { href: "/cashbox", icon: Wallet, label: "الصندوق المحاسبي", tooltip: "إدارة الصندوق النقدي", roles: ['Admin', 'BranchEmployee', 'Developer'] },
    { href: "/debts", icon: Banknote, label: "الديون", tooltip: "إدارة الديون والذمم", roles: ['Admin', 'Developer', 'BranchEmployee'] },
     { href: "/financials", icon: TrendingUp, label: "الملخصات المالية", tooltip: "عرض الملخصات المالية", roles: ['Admin', 'Developer'] },
 ];

const driverToolsSubMenu = [
    { href: "/driver-tracking", icon: Route, label: "تتبع السائق", roles: ['Admin', 'BranchEmployee', 'Developer'] },
];


const systemSettingsNavItem = { href: "/tracking-settings", icon: SettingsIconLucideReal, label: "إعدادات النظام", tooltip: "إعدادات النظام والفرع الحالي", roles: ['Admin', 'Developer'] };
const developerNavItem = { href: "/developer", icon: ShieldCheck, label: "واجهة المطور", tooltip: "إعدادات المطور المتقدمة", roles: ['Admin', 'Developer'] };
const databaseBackupNavItem = { href: "/database-backup", icon: DatabaseBackup, label: "النسخ الاحتياطي", tooltip: "إدارة النسخ الاحتياطي لقاعدة البيانات", roles: ['Admin', 'Developer'] };
const customerTrackingNavItem = { href: "/track", icon: Search, label: "تتبع العملاء", tooltip: "صفحة تتبع الشحنات للعملاء", roles: ['Admin', 'Developer'] };


interface SidebarNavProps {
  userRole: UserRole;
}

export function SidebarNav({ userRole = "BranchEmployee" }: SidebarNavProps) {
  const pathname = usePathname();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  
  const isSubMenuActive = (items: any[]) => {
    return items.some(item => pathname.startsWith(item.href));
  }

  const visibleNavItems = navItemsBase.filter(item => item.roles.includes(userRole));
  const visibleSentParcels = sentParcelsSubMenu.filter(item => item.roles.includes(userRole));
  const visibleReceivedParcels = receivedParcelsSubMenu.filter(item => item.roles.includes(userRole));
  const visibleFinancials = financialsSubMenu.filter(item => item.roles.includes(userRole));
  const visibleDriverTools = driverToolsSubMenu.filter(item => item.roles.includes(userRole));

  const showSystemSettingsLink = systemSettingsNavItem.roles.includes(userRole);
  const showDeveloperLink = developerNavItem.roles.includes(userRole);
  const showDatabaseBackupLink = databaseBackupNavItem.roles.includes(userRole);
  const showCustomerTrackingLink = customerTrackingNavItem.roles.includes(userRole);


  return (
    <>
      <SidebarHeader className={cn(isCollapsed && "items-center")}>
        <Link href="/dashboard" className="flex items-center gap-2 text-xl font-semibold text-primary" onClick={handleLinkClick}>
                  <span className={cn("transition-opacity", isCollapsed && "opacity-0 hidden")}>الجعيدي للنقل</span>
                  <Truck className={cn("h-7 w-7 transition-all", isCollapsed && "h-6 w-6")} />
        </Link>
      </SidebarHeader>
          {/* Sent Parcels Dropdown */}
          {visibleSentParcels.length > 0 && (
              <SidebarMenuItem>
                  <SidebarMenuButton
                      isActive={isSubMenuActive(visibleSentParcels)}
                      tooltip={{ children: "طرود مرسلة", className: "capitalize" }}
                      data-state={isSubMenuActive(visibleSentParcels) ? "open" : "closed"}
                  >
                      <ArrowUpLeftFromCircle />
                      <span>طرود مرسلة</span>
                  </SidebarMenuButton>
                  <SidebarMenuSub>
                      {visibleSentParcels.map((item) => (
                          <SidebarMenuItem key={item.href}>
                              <SidebarMenuSubButton asChild isActive={pathname.startsWith(item.href)}>
                                  <Link href={item.href} onClick={handleLinkClick}>
                                      <item.icon />
                                      <span>{item.label}</span>
                                  </Link>
                              </SidebarMenuSubButton>
                          </SidebarMenuItem>
                      ))}
                  </SidebarMenuSub>
              </SidebarMenuItem>
          )}

          {/* Received Parcels Dropdown */}
          {visibleReceivedParcels.length > 0 && (
              <SidebarMenuItem>
                  <SidebarMenuButton
                      isActive={isSubMenuActive(visibleReceivedParcels)}
                      tooltip={{ children: "طرود مستلمة", className: "capitalize" }}
                      data-state={isSubMenuActive(visibleReceivedParcels) ? "open" : "closed"}
                  >
                      <ArrowDownRightFromCircle />
                      <span>طرود مستلمة</span>
                  </SidebarMenuButton>
                  <SidebarMenuSub>
                      {visibleReceivedParcels.map((item) => (
                          <SidebarMenuItem key={item.href}>
                              <SidebarMenuSubButton asChild isActive={pathname.startsWith(item.href)}>
                                  <Link href={item.href} onClick={handleLinkClick}>
                                      <item.icon />
                                      <span>{item.label}</span>
                                  </Link>
                              </SidebarMenuSubButton>
                          </SidebarMenuItem>
                      ))}
                  </SidebarMenuSub>
              </SidebarMenuItem>
          )}
      <SidebarContent>
        <SidebarMenu>
          {visibleNavItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
                tooltip={{children: item.tooltip, className: "capitalize"}}
              >
                <Link href={item.href} onClick={handleLinkClick}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          
      

            {/* Financials Dropdown */}
            {visibleFinancials.length > 0 && (
                <SidebarMenuItem>
                    <SidebarMenuButton
                        isActive={isSubMenuActive(visibleFinancials)}
                        tooltip={{children: "الشؤون المالية", className: "capitalize"}}
                        data-state={isSubMenuActive(visibleFinancials) ? "open" : "closed"}
                    >
                        <Coins />
                        <span>الشؤون المالية</span>
                    </SidebarMenuButton>
                    <SidebarMenuSub>
                        {visibleFinancials.map((item) => (
                             <SidebarMenuItem key={item.href}>
                                <SidebarMenuSubButton asChild isActive={pathname.startsWith(item.href)}>
                                    <Link href={item.href} onClick={handleLinkClick}>
                                        <item.icon />
                                        <span>{item.label}</span>
                                    </Link>
                                </SidebarMenuSubButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenuSub>
                </SidebarMenuItem>
            )}
            
            {/* Driver Tools Dropdown */}
            {visibleDriverTools.length > 0 && (
                <SidebarMenuItem>
                    <SidebarMenuButton
                        isActive={isSubMenuActive(visibleDriverTools)}
                        tooltip={{children: "أدوات السائق", className: "capitalize"}}
                        data-state={isSubMenuActive(visibleDriverTools) ? "open" : "closed"}
                    >
                        <UserCog />
                        <span>أدوات السائق</span>
                    </SidebarMenuButton>
                    <SidebarMenuSub>
                        {visibleDriverTools.map((item) => (
                             <SidebarMenuItem key={item.href}>
                                <SidebarMenuSubButton asChild isActive={pathname.startsWith(item.href)}>
                                    <Link href={item.href} onClick={handleLinkClick}>
                                        <item.icon />
                                        <span>{item.label}</span>
                                    </Link>
                                </SidebarMenuSubButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenuSub>
                </SidebarMenuItem>
            )}


        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className={cn(isCollapsed && "items-center")}>
         <SidebarMenu>
            {showSystemSettingsLink && (
                <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={pathname === systemSettingsNavItem.href}
                    tooltip={{children: systemSettingsNavItem.tooltip, className: "capitalize"}}
                >
                    <Link href={systemSettingsNavItem.href} onClick={handleLinkClick}>
                    <systemSettingsNavItem.icon />
                    <span>{systemSettingsNavItem.label}</span>
                    </Link>
                </SidebarMenuButton>
                </SidebarMenuItem>
            )}
             {showCustomerTrackingLink && (
                <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={pathname === customerTrackingNavItem.href}
                    tooltip={{children: customerTrackingNavItem.tooltip, className: "capitalize"}}
                >
                    <Link href={customerTrackingNavItem.href} onClick={handleLinkClick} target="_blank">
                    <customerTrackingNavItem.icon />
                    <span>{customerTrackingNavItem.label}</span>
                    </Link>
                </SidebarMenuButton>
                </SidebarMenuItem>
            )}
            {showDatabaseBackupLink && (
                <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={pathname === databaseBackupNavItem.href}
                    tooltip={{children: databaseBackupNavItem.tooltip, className: "capitalize"}}
                >
                    <Link href={databaseBackupNavItem.href} onClick={handleLinkClick}>
                    <databaseBackupNavItem.icon />
                    <span>{databaseBackupNavItem.label}</span>
                    </Link>
                </SidebarMenuButton>
                </SidebarMenuItem>
            )}
            {showDeveloperLink && (
                <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={pathname === developerNavItem.href}
                    tooltip={{children: developerNavItem.tooltip, className: "capitalize"}}
                >
                    <Link href={developerNavItem.href} onClick={handleLinkClick}>
                    <developerNavItem.icon />
                    <span>{developerNavItem.label}</span>
                    </Link>
                </SidebarMenuButton>
                </SidebarMenuItem>
            )}
         </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
