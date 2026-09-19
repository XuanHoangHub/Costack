/* ═══════════════════════════════════════════════════════
   Apexa UI Component Library — Barrel Exports
   ═══════════════════════════════════════════════════════ */

// ── Core Primitives ──
export { Button, ButtonGroup } from "./Button";
export { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "./Card";
export { Badge, CountBadge, PriorityBadge, StatusBadge } from "./Badge";
export { NavItem } from "./NavItem";
export { SegmentedControl } from "./SegmentedControl";
export { Checkbox } from "./Checkbox";
export type { CheckboxProps, CheckboxSize, CheckboxVariant } from "./Checkbox";

// ── Form Controls ──
export { Input } from "./Input";
export { Select } from "./Select";
export { Switch } from "./Switch";

// ── Feedback ──
export { Progress, CircularProgress } from "./Progress";
export { Skeleton, SkeletonText, SkeletonAvatar, SkeletonCard } from "./Skeleton";
export { EmptyState } from "./EmptyState";

// ── Overlay / Dialog ──
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "./Accordion";
export { Collapsible, CollapsibleTrigger, CollapsibleContent } from "./Collapsible";
export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "./Dialog";
export { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "./Drawer";
export { CommandPalette, CommandGroup, CommandItem } from "./CommandPalette";
export { Popover, PopoverTrigger, PopoverContent, PopoverClose } from "./Popover";
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "./DropdownMenu";
export { Tooltip, TooltipProvider } from "./Tooltip";

// ── Navigation / Layout ──
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./Tabs";
export { ScrollArea } from "./ScrollArea";
export { Separator } from "./Separator";
export { Avatar, AvatarGroup } from "./Avatar";

// ── Data Display ──
export { FloatingCommandBar } from "./FloatingCommandBar";
export { MockupFrame } from "./MockupFrame";

// ── Toast (imperative API) ──
export { Toaster, toast } from "./Toast";

// ── Brand Assets ──
export { ApexaAiIcon, ApexaAiAvatar } from "../ApexaAiIcon";
export { ApexaLogoIcon, ApexaBrand } from "../ApexaLogo";
