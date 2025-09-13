
"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { Locale } from 'date-fns';

interface ClientFormattedDateProps {
  dateString: string;
  formatString: string;
  locale?: Locale;
  placeholder?: React.ReactNode;
}

export function ClientFormattedDate({ dateString, formatString, locale, placeholder = "..." }: ClientFormattedDateProps) {
  const [clientFormattedDate, setClientFormattedDate] = useState<string | null>(null);

  useEffect(() => {
    // This effect runs only on the client, after hydration
    try {
      const date = new Date(dateString);
      setClientFormattedDate(format(date, formatString, { locale }));
    } catch (error) {
      console.error("Error formatting date:", error);
      // Set to a fallback or the original string if formatting fails
      setClientFormattedDate(dateString); 
    }
  }, [dateString, formatString, locale]);

  if (clientFormattedDate === null) {
    return <>{placeholder}</>; // Render placeholder until client-side format is ready
  }

  return <>{clientFormattedDate}</>;
}
