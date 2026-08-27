'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  BellOff,
  CheckCheck,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Clock,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import {
  getNotificationsAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
  type NotificationItem,
} from '../app/actions';

interface NotificationBellProps {
  initialUnreadCount?: number;
}

function formatRelativeTimeThai(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'เมื่อสักครู่';
    if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
    if (diffHour < 24) return `${diffHour} ชั่วโมงที่แล้ว`;
    if (diffDay === 1) return 'เมื่อวานนี้';
    if (diffDay < 7) return `${diffDay} วันที่แล้ว`;

    return d.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function NotificationBell({ initialUnreadCount = 0 }: NotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasDismissedGlow, setHasDismissedGlow] = useState(false);
  const previousUnreadCountRef = useRef(initialUnreadCount);
  const [, startTransition] = useTransition();

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync initial unread count if prop changes
  useEffect(() => {
    setUnreadCount(initialUnreadCount);
    previousUnreadCountRef.current = initialUnreadCount;
  }, [initialUnreadCount]);

  // Fetch notifications
  const fetchNotifications = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await getNotificationsAction();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);

      // If new unread notifications arrived, trigger red edge glow alert
      if (res.unreadCount > previousUnreadCountRef.current) {
        setHasDismissedGlow(false);
      }
      previousUnreadCountRef.current = res.unreadCount;
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Initial fetch on open & background polling
  useEffect(() => {
    // Initial fetch
    fetchNotifications(true);

    // Poll every 12 seconds when window is active
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchNotifications(true);
      }
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    // Dismiss the screen border glow when the user clicks to view notifications
    setHasDismissedGlow(true);
    if (!isOpen) {
      fetchNotifications(false);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    setHasDismissedGlow(true);
    // Optimistically mark as read
    if (!item.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      startTransition(async () => {
        await markNotificationAsReadAction(item.id);
      });
    }

    setIsOpen(false);

    if (item.job_id) {
      router.push(`/jobs/${item.job_id}`);
    } else {
      router.push('/notifications');
    }
  };

  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHasDismissedGlow(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    startTransition(async () => {
      await markAllNotificationsAsReadAction();
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'CUSTOMER_APPROVED':
        return {
          icon: <CheckCircle2 size={16} />,
          bg: '#f0fdf4',
          color: '#16a34a',
        };
      case 'REVISION_REQUESTED':
        return {
          icon: <AlertCircle size={16} />,
          bg: '#fff7ed',
          color: '#ea580c',
        };
      case 'JOB_ASSIGNED':
      default:
        return {
          icon: <Sparkles size={16} />,
          bg: '#eff6ff',
          color: '#2563eb',
        };
    }
  };

  const shouldShowGlow = unreadCount > 0 && !hasDismissedGlow && !isOpen;

  return (
    <>
      {/* Full-Screen Ambient Red Border Glow Alert mounted directly to document.body */}
      {mounted && shouldShowGlow && typeof document !== 'undefined'
        ? createPortal(
            <div className="notification-screen-glow" aria-hidden="true" />,
            document.body
          )
        : null}

      <div style={{ position: 'relative', display: 'inline-block' }}>
        {/* Bell Button */}
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleDropdown}
          className={`icon-button ${shouldShowGlow ? 'bell-alert-active' : ''}`}
          aria-label="การแจ้งเตือน"
          aria-expanded={isOpen}
          style={{
            position: 'relative',
            background: isOpen ? 'var(--canvas, #f4f4f5)' : 'transparent',
            border: shouldShowGlow ? '1.5px solid rgba(220, 38, 38, 0.6)' : 'none',
            borderRadius: '8px',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: isOpen || shouldShowGlow ? 'var(--red, #dc2626)' : 'var(--ink, #18181b)',
            transition: 'all 0.15s ease',
          }}
        >
          <Bell size={20} className={shouldShowGlow ? 'bell-icon-wiggle' : ''} />
          {unreadCount > 0 ? (
            <span
              className={shouldShowGlow ? 'badge-alert-pulse' : ''}
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                minWidth: '16px',
                height: '16px',
                padding: '0 4px',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                borderRadius: '8px',
                fontSize: '10px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #ffffff',
                boxShadow: '0 1px 3px rgba(220, 38, 38, 0.4)',
                lineHeight: 1,
              }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </button>

      {/* Flyout Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '380px',
            maxWidth: 'calc(100vw - 24px)',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow:
              '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e4e4e7',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeInSlide 0.18s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #f4f4f5',
              backgroundColor: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '15px', fontWeight: 700, color: '#18181b' }}>
                การแจ้งเตือน
              </strong>
              {unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                  }}
                >
                  {unreadCount} ใหม่
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <CheckCheck size={14} />
                <span>อ่านทั้งหมด</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div
            style={{
              maxHeight: '380px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {loading ? (
              <div
                style={{
                  padding: '36px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  color: '#71717a',
                }}
              >
                <Loader2
                  size={24}
                  style={{ color: '#dc2626', animation: 'spin 1s linear infinite' }}
                />
                <span style={{ fontSize: '13px' }}>กำลังโหลดการแจ้งเตือน...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  color: '#71717a',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#f4f4f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#a1a1aa',
                    marginBottom: '4px',
                  }}
                >
                  <BellOff size={22} />
                </div>
                <strong style={{ fontSize: '14px', color: '#27272a' }}>
                  ไม่มีการแจ้งเตือนใหม่
                </strong>
                <span style={{ fontSize: '12px', color: '#a1a1aa' }}>
                  เมื่อมีงานมอบหมายหรืออนุมัติแบบ จะแสดงที่นี่
                </span>
              </div>
            ) : (
              notifications.map((item) => {
                const iconInfo = getNotificationIcon(item.notification_type);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    style={{
                      padding: '12px 18px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      borderBottom: '1px solid #f4f4f5',
                      backgroundColor: item.is_read ? '#ffffff' : '#fef2f2',
                      cursor: 'pointer',
                      transition: 'background-color 0.12s ease',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = item.is_read
                        ? '#f9fafb'
                        : '#fee2e2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = item.is_read
                        ? '#ffffff'
                        : '#fef2f2';
                    }}
                  >
                    {/* Unread Indicator Bar */}
                    {!item.is_read && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: '12px',
                          bottom: '12px',
                          width: '3.5px',
                          backgroundColor: '#dc2626',
                          borderRadius: '0 2px 2px 0',
                        }}
                      />
                    )}

                    {/* Icon */}
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        backgroundColor: iconInfo.bg,
                        color: iconInfo.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      {iconInfo.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: item.is_read ? 600 : 750,
                          color: item.is_read ? '#18181b' : '#991b1b',
                          lineHeight: 1.35,
                          marginBottom: '3px',
                        }}
                      >
                        {item.title}
                      </div>
                      {item.message && (
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#52525b',
                            lineHeight: 1.4,
                            marginBottom: '4px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {item.message}
                        </div>
                      )}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          color: '#a1a1aa',
                          fontWeight: 500,
                        }}
                      >
                        <Clock size={11} />
                        <span>{formatRelativeTimeThai(item.created_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '10px 18px',
              backgroundColor: '#fafafa',
              borderTop: '1px solid #f4f4f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 650,
                color: '#dc2626',
                textDecoration: 'none',
                padding: '4px 8px',
                borderRadius: '6px',
                transition: 'color 0.15s ease',
              }}
            >
              <span>ดูประวัติการแจ้งเตือนทั้งหมด</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}
    </div>
  </>
  );
}
