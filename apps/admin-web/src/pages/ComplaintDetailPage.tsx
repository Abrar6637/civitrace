import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { AssetLinkPanel } from '@/features/complaints/AssetLinkPanel';
import { DuplicatesPanel } from '@/features/complaints/DuplicatesPanel';

import { AlertTriangle, ArrowLeft, MapPinOff, Phone, ThumbsUp } from 'lucide-react';
import {
    CATEGORY_LABELS,
    SETTLEMENT_TYPE_LABELS,
    getDivisionOf,
} from '@civitrace/shared';
import { complaintsService } from '@/services/complaints.service';
import { ApiError } from '@/services/api';
import { formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge, VerificationBadge } from '@/features/complaints/ComplaintBadges';
import { LocationMap } from '@/features/complaints/LocationMap';
import { Timeline } from '@/features/complaints/Timeline';
import { StatusActionPanel } from '@/features/complaints/StatusActionPanel';
import { ConfirmationCard } from '@/features/complaints/ConfirmationCard';
import { SimulateCitizenReply } from '@/features/complaints/SimulateCitizenReply';

const NA = <span className="text-slate-400">Not available</span>;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <dt className="text-xs text-slate-400">{label}</dt>
            <dd className="mt-0.5 text-sm text-slate-800">{children}</dd>
        </div>
    );
}

export default function ComplaintDetailPage() {
    const { id = '' } = useParams();

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['complaint', id],
        queryFn: () => complaintsService.get(id),
        enabled: !!id,
    });

    const backLink = (
        <Link
            to="/complaints"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
        >
            <ArrowLeft className="size-4" aria-hidden />
            All complaints
        </Link>
    );

    if (isLoading) {
        return (
            <div className="space-y-6">
                {backLink}
                <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="h-96 animate-pulse rounded-xl bg-slate-100 lg:col-span-2" />
                    <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
                </div>
            </div>
        );
    }

    if (error || !data) {
        const notFound = error instanceof ApiError && error.status === 404;
        return (
            <div className="space-y-6">
                {backLink}
                <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-12 text-center">
                    <p className="text-sm text-slate-600">
                        {notFound ? 'Yeh complaint nahi mili, ya aapke district mein nahi hai.' : 'Complaint load nahi ho saki.'}
                    </p>
                    {!notFound && (
                        <Button variant="secondary" size="sm" onClick={() => refetch()}>
                            Try again
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    const { complaint: c, events, confirmation, asset, duplicates, mergedInto, mergedFrom } = data;
    const loc = c.location;

    return (
        <div className="space-y-6">
            {backLink}

            {/* Header */}
            <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-medium text-brand-700">{c.complaintNo}</span>
                    <StatusBadge status={c.status} />
                    <VerificationBadge state={c.verification} />
                    {c.isHazard && (
                        <Badge tone="red">
                            <AlertTriangle className="size-3" aria-hidden /> Hazard
                        </Badge>

                    )}
                    {c.mergedIntoId && <Badge tone="gray">Merged</Badge>}
                </div>
                <h1 className="text-2xl font-semibold text-slate-900">{CATEGORY_LABELS[c.category]}</h1>
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                    <span>Submitted {formatDate(c.createdAt)}</span>
                    <span className="inline-flex items-center gap-1">
                        <ThumbsUp className="size-3.5" aria-hidden /> {c.supportCount} citizens support this
                    </span>
                </p>
            </div>

            {c.isHazard && (
                <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    <Phone className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>
                        Yeh khatarnak masla hai. Fori khatre ki soorat mein citizen ko <strong>1122</strong> (Rescue)
                        ya <strong>15</strong> (Police) par rabta karne ki hidayat di gayi thi. Civitrace emergency
                        service nahi hai.
                    </span>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left column */}
                <div className="space-y-6 lg:col-span-2">
                    <Card title="Description">
                        <p className="text-sm leading-relaxed text-slate-700">{c.description}</p>
                    </Card>

                    <Card title="Location">
                        <div className="space-y-5">
                            <dl className="grid gap-4 sm:grid-cols-3">
                                <Field label="Province">{loc.province}</Field>
                                <Field label="Division">{getDivisionOf(loc.district) ?? NA}</Field>
                                <Field label="District">{loc.district}</Field>
                                <Field label="Tehsil">{loc.tehsil}</Field>
                                <Field label="Union Council no.">{loc.unionCouncil.number ?? NA}</Field>
                                <Field label="Union Council name">{loc.unionCouncil.name ?? NA}</Field>
                                <Field label={SETTLEMENT_TYPE_LABELS[loc.settlement.type]}>{loc.settlement.name}</Field>
                                <Field label="Street / landmark">{loc.address ?? NA}</Field>
                                <Field label="GPS">
                                    {c.point
                                        ? `${c.point.lat.toFixed(5)}, ${c.point.lng.toFixed(5)}${c.point.accuracyM ? ` (±${c.point.accuracyM} m)` : ''}`
                                        : NA}
                                </Field>
                            </dl>

                            {c.lowConfidenceGps && (
                                <div className="flex gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                                    <MapPinOff className="mt-0.5 size-4 shrink-0" aria-hidden />
                                    GPS ki accuracy kam thi. Publish karne se pehle location manually check karein.
                                </div>
                            )}

                            {c.point && <LocationMap point={c.point} confirmationPoint={confirmation?.point} />}
                        </div>
                    </Card>

                    <Card title="Timeline">
                        <Timeline events={events} />
                    </Card>
                </div>

                {/* Right column */}
                <div className="space-y-6">
                    <Card title="Actions">
                        <StatusActionPanel complaint={c} />
                    </Card>
                    <Card title="Linked asset">
                        <AssetLinkPanel complaint={c} asset={asset} />
                    </Card>
                    <Card title={c.mergedIntoId ? 'Merged' : `Possible duplicates (${duplicates.length})`}>
                        <DuplicatesPanel complaint={c} duplicates={duplicates} mergedInto={mergedInto} mergedFrom={mergedFrom} />
                    </Card>

                    {import.meta.env.DEV && c.status === 'awaiting_confirmation' && (
                        <SimulateCitizenReply complaintId={c.id} />
                    )}

                    <Card title="Citizen confirmation">
                        <ConfirmationCard complaint={c} confirmation={confirmation} />
                    </Card>

                    <Card title="Notifications">
                        <dl className="space-y-3">
                            <Field label="Notify MNA">{c.notifyMna ? 'Requested by citizen' : 'No'}</Field>
                            <Field label="Notify MPA">{c.notifyMpa ? 'Requested by citizen' : 'No'}</Field>
                        </dl>
                    </Card>
                </div>
            </div>
        </div>
    );
}