import AvailabilityReminder from '@/components/AvailabilityReminder';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AvailabilityReminder />
    </>
  );
}
