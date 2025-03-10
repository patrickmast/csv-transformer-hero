// Updated to add i18n translations
import { useEffect, useState } from 'react';
import { VanillaHoverCard, VanillaHoverCardTrigger, VanillaHoverCardContent } from './vanilla/react/VanillaHoverCard';
import { formatRelativeDate } from '@/utils/dateFormat';
import { useTranslation } from 'react-i18next';

const DEPLOYMENT_TIMESTAMP = import.meta.env.VITE_DEPLOYMENT_TIMESTAMP || '1704063600000';

const VersionDisplay = () => {
  const [lastModified, setLastModified] = useState<string>(DEPLOYMENT_TIMESTAMP);
  const [tooltipText, setTooltipText] = useState<string>('');

  useEffect(() => {
    if (import.meta.env.DEV) {
      const fetchLastModified = async () => {
        try {
          const response = await fetch('/api/last-modified');
          const data = await response.json();
          const date = new Date(Number(data.timestamp));
          const { dateStr, timeStr } = formatRelativeDate(date);
          setLastModified(timeStr);
          setTooltipText(`${dateStr} at ${timeStr}`);
        } catch (error) {
          // Improved error handling with more specific message
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('Failed to fetch last modified time:', { error: errorMessage });
        }
      };

      fetchLastModified();
      const interval = setInterval(fetchLastModified, 5000); // Update every 5 seconds in dev mode
      return () => clearInterval(interval);
    }
  }, []);

  const getVersionNumber = () => {
    const REFERENCE_TIMESTAMP = 1704063600; // Jan 1, 2025 00:00:00 UTC
    const secondsSinceReference = Math.floor(Number(lastModified) / 1000) - REFERENCE_TIMESTAMP;
    const versionNumber = secondsSinceReference - 31560000;

    if (versionNumber < 0) {
      return "unknown";
    }

    return versionNumber.toString().replace(/(\d)(?=(\d{3})+$)/g, '$1.');
  };

  /**
   * Returns a domain suffix for display purposes
   * Updated to handle 127.0.0.1 addresses as 'localhost'
   */
  const getDomainSuffix = () => {
    return getDomainSuffixUtil();
  };

  const { t } = useTranslation();

  if (!import.meta.env.DEV) {
    const { dateStr, timeStr } = formatRelativeDate(new Date(Number(lastModified)));
    return (
      <VanillaHoverCard>
        <VanillaHoverCardTrigger>
          <span className="cursor-pointer">
            {t('common.version')} {getVersionNumber()}
          </span>
        </VanillaHoverCardTrigger>
        <VanillaHoverCardContent>
          <span className="whitespace-nowrap">
            {t('common.deployedOn')} {t(`common.${dateStr.toLowerCase()}`)} {t('common.at')} {timeStr}{getDomainSuffix()}
          </span>
        </VanillaHoverCardContent>
      </VanillaHoverCard>
    );
  }

  return (
    <VanillaHoverCard>
      <VanillaHoverCardTrigger>
        <span className="cursor-pointer">
          {t('common.lastModified')}: {lastModified}{getDomainSuffix()}
        </span>
      </VanillaHoverCardTrigger>
      <VanillaHoverCardContent>
        <span className="whitespace-nowrap">
          {tooltipText}{getDomainSuffix()}
        </span>
      </VanillaHoverCardContent>
    </VanillaHoverCard>
  );
};

/**
 * Returns a domain suffix for display purposes
 * Updated to handle 127.0.0.1 addresses as 'localhost'
 */
export const getDomainSuffixUtil = (): string => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const fullUrl = `${protocol}//${hostname}`;

  // Handle localhost and IP variations
  if (hostname === 'localhost' || hostname === '0.0.0.0' || fullUrl.startsWith('http://127')) return ' (localhost)';

  const parts = hostname.split('.');
  if (parts.length >= 2) {
    const domain = parts.slice(-2).join('.');
    return ` (On ${domain})`;
  }
  return '';
};

export default VersionDisplay;