import React from 'react';

/**
 * PageShell — standard inner-page wrapper.
 *
 * Renders a consistent page header with title, optional subtitle,
 * and an optional actions slot (buttons / selects), then the page content.
 *
 * Usage:
 *   <PageShell title="Dashboard" subtitle="Your project overview">
 *     <YourContent />
 *   </PageShell>
 *
 *   With actions:
 *   <PageShell title="Tasks" actions={<Button>Add Task</Button>}>
 *     <YourContent />
 *   </PageShell>
 */
const PageShell = ({ title, subtitle, actions, children, className = '' }) => {
    return (
        <div className={`flex flex-col gap-8 ${className}`}>
            {/* Page Header */}
            {(title || actions) && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border">
                    {title && (
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                {title}
                            </h1>
                            {subtitle && (
                                <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
                            )}
                        </div>
                    )}
                    {actions && (
                        <div className="flex items-center gap-2 shrink-0">{actions}</div>
                    )}
                </div>
            )}

            {/* Page Content */}
            <div className="flex-1">{children}</div>
        </div>
    );
};

export default PageShell;
