'use client';

import React, { useState, useMemo, useSyncExternalStore, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppHeader } from '@/components/ui/AppHeader';
import { EmergencyBanner } from '@/components/ui/EmergencyBanner';
import { Card, GlowSurface, LocationCapture } from '@/components/ui';
import { type BloodRequest, DEMO_DISTRICTS } from '@/types';
import {
  VALID_BLOOD_GROUPS,
  VALID_BLOOD_COMPONENTS,
  validateBloodRequest,
  type BloodRequestFormData,
} from '@/lib/validation';


function subscribeActiveRequest(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}
function getActiveRequestSnapshot(): string | null {
  return window.localStorage.getItem("hemo_match_active_request");
}
function getActiveRequestServerSnapshot(): string | null {
  return null;
}

function BloodRequestFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get("mode") === "edit";

  const storedRequestJson = useSyncExternalStore(
    subscribeActiveRequest,
    getActiveRequestSnapshot,
    getActiveRequestServerSnapshot
  );

  const existingRequest = useMemo<BloodRequest | null>(() => {
    if (!storedRequestJson || !isEditMode) return null;
    try {
      return JSON.parse(storedRequestJson) as BloodRequest;
    } catch {
      return null;
    }
  }, [storedRequestJson, isEditMode]);

  const [initializedRequestId, setInitializedRequestId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockReason, setLockReason] = useState<string>("");

  // Form State
  const [formData, setFormData] = useState<Partial<BloodRequestFormData>>({
    bloodGroup: undefined,
    component: "Whole Blood",
    unitsNeeded: 1,
    districtId: "",
    approximateArea: "",
    hospitalName: "",
    requiredByDate: "",
    requiredByTime: "",
    urgency: "urgent",
    notes: "",
    locationLatitude: null,
    locationLongitude: null,
  });

  if (isEditMode && existingRequest && initializedRequestId !== existingRequest.id) {
    setInitializedRequestId(existingRequest.id);

    let locked = false;
    let reason = "";

    if (typeof window !== "undefined") {
      try {
        const revealsRaw = window.localStorage.getItem("hemo_match_contact_reveals");
        if (revealsRaw) {
          const reveals = JSON.parse(revealsRaw);
          if (reveals && typeof reveals === "object" && Object.keys(reveals).length > 0) {
            locked = true;
            reason = "A volunteer donor contact has already been revealed for this request.";
          }
        }
        const responsesRaw = window.localStorage.getItem("hemo_match_donor_responses");
        if (responsesRaw) {
          const responses = JSON.parse(responsesRaw);
          if (responses && typeof responses === "object" && Object.keys(responses).length > 0) {
            locked = true;
            reason = "A volunteer donor has already responded to this request.";
          }
        }
      } catch {}
    }

    if (existingRequest.status && existingRequest.status !== "open" && existingRequest.status !== "active") {
      locked = true;
      reason = `Request lifecycle status is "${existingRequest.status}".`;
    }

    if (locked) {
      setIsLocked(true);
      setLockReason(reason);
    }

    setFormData({
      bloodGroup: existingRequest.bloodGroup,
      component: existingRequest.component,
      unitsNeeded: existingRequest.unitsNeeded,
      districtId: existingRequest.districtId,
      approximateArea: existingRequest.approximateArea,
      hospitalName: existingRequest.hospitalName,
      requiredByDate: existingRequest.requiredByDate,
      requiredByTime: existingRequest.requiredByTime,
      urgency: existingRequest.urgency,
      notes: existingRequest.notes || "",
      locationLatitude: existingRequest.locationLatitude ?? null,
      locationLongitude: existingRequest.locationLongitude ?? null,
    });
  }

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Field change helper
  const updateField = <K extends keyof BloodRequestFormData>(
    field: K,
    value: BloodRequestFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (submitError) {
      setSubmitError(null);
    }
    // Clear error for that field on change
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const selectedDistrict = useMemo(
    () => DEMO_DISTRICTS.find((d) => d.id === formData.districtId),
    [formData.districtId]
  );

  const formattedRequiredTime = useMemo(() => {
    if (!formData.requiredByDate) return 'Not scheduled';
    try {
      const d = new Date(`${formData.requiredByDate}T${formData.requiredByTime || '00:00'}`);
      if (isNaN(d.getTime())) return `${formData.requiredByDate} ${formData.requiredByTime || ''}`;
      return d.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: formData.requiredByTime ? 'numeric' : undefined,
        minute: formData.requiredByTime ? '2-digit' : undefined,
        hour12: true,
      });
    } catch {
      return `${formData.requiredByDate} ${formData.requiredByTime || ''}`;
    }
  }, [formData.requiredByDate, formData.requiredByTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setSubmitError(null);
    setIsSubmitting(true);

    const validation = validateBloodRequest(formData);

    if (!validation.isValid || !validation.data) {
      setErrors(validation.errors);
      setIsSubmitting(false);

      // Scroll to first error field
      const firstErrorField = Object.keys(validation.errors)[0];
      if (firstErrorField) {
        const element = document.getElementById(firstErrorField);
        if (element) {
          element.focus();
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }

    const d = validation.data;

    // Edit mode handling
    if (isEditMode && existingRequest?.id) {
      try {
        const response = await fetch("/api/requests", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: existingRequest.id,
            bloodGroup: d.bloodGroup,
            component: d.component,
            unitsNeeded: d.unitsNeeded,
            districtId: d.districtId,
            approximateArea: d.approximateArea,
            hospitalName: d.hospitalName,
            requiredByDate: d.requiredByDate,
            requiredByTime: d.requiredByTime,
            urgency: d.urgency,
            notes: d.notes || undefined,
            locationLatitude: d.locationLatitude ?? null,
            locationLongitude: d.locationLongitude ?? null,
          }),
        });

        const result = await response.json().catch(() => null);

        if (response.status === 409) {
          setSubmitError(result?.message || "This request cannot be modified because donor coordination has already commenced.");
          setIsSubmitting(false);
          return;
        }

        if (response.status === 400 && result?.errors) {
          setErrors(result.errors);
          setSubmitError(result?.message || "Please correct the errors indicated below.");
          setIsSubmitting(false);
          return;
        }

        const updatedRequest: BloodRequest = {
          id: existingRequest.id,
          bloodGroup: d.bloodGroup,
          component: d.component,
          unitsNeeded: d.unitsNeeded,
          districtId: d.districtId,
          districtName: selectedDistrict?.name ?? d.districtId,
          approximateArea: d.approximateArea,
          hospitalName: d.hospitalName,
          requiredByDate: d.requiredByDate,
          requiredByTime: d.requiredByTime,
          urgency: d.urgency,
          notes: d.notes,
          status: "open",
          locationLatitude: d.locationLatitude ?? null,
          locationLongitude: d.locationLongitude ?? null,
          createdAt: existingRequest.createdAt,
          updatedAt: new Date().toISOString(),
        };

        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(
              "hemo_match_active_request",
              JSON.stringify(updatedRequest)
            );
            window.dispatchEvent(new Event("storage"));
          }
        } catch {
          console.warn("Unable to update request in localStorage");
        }

        router.push("/requests/matching-demo");
        return;
      } catch {
        // In offline/fallback environments, update localStorage directly
        const fallbackRequest: BloodRequest = {
          id: existingRequest.id,
          bloodGroup: d.bloodGroup,
          component: d.component,
          unitsNeeded: d.unitsNeeded,
          districtId: d.districtId,
          districtName: selectedDistrict?.name ?? d.districtId,
          approximateArea: d.approximateArea,
          hospitalName: d.hospitalName,
          requiredByDate: d.requiredByDate,
          requiredByTime: d.requiredByTime,
          urgency: d.urgency,
          notes: d.notes,
          status: "open",
          locationLatitude: d.locationLatitude ?? null,
          locationLongitude: d.locationLongitude ?? null,
          createdAt: existingRequest.createdAt,
          updatedAt: new Date().toISOString(),
        };
        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem("hemo_match_active_request", JSON.stringify(fallbackRequest));
            window.dispatchEvent(new Event("storage"));
          }
        } catch {}
        router.push("/requests/matching-demo");
        return;
      }
    }

    // Send validated payload to POST /api/requests without client-generated ID
    const payload = {
      bloodGroup: d.bloodGroup,
      component: d.component,
      unitsNeeded: d.unitsNeeded,
      districtId: d.districtId,
      approximateArea: d.approximateArea,
      hospitalName: d.hospitalName,
      requiredByDate: d.requiredByDate,
      requiredByTime: d.requiredByTime,
      urgency: d.urgency,
      notes: d.notes || undefined,
      locationLatitude: d.locationLatitude ?? null,
      locationLongitude: d.locationLongitude ?? null,
    };

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);

      const hasValidRequestId =
        typeof result?.request?.id === 'string' &&
        result.request.id.trim().length > 0;

      if (
        response.status !== 201 ||
        !result?.success ||
        !result?.request ||
        !hasValidRequestId
      ) {
        if (result?.errors && typeof result.errors === 'object') {
          setErrors(result.errors);
        }
        const userMessage =
          response.status === 503 || result?.error === 'service_unavailable'
            ? 'Database service is temporarily unavailable. Please try again shortly.'
            : typeof result?.message === 'string' && response.status >= 400 && response.status < 500
            ? result.message
            : 'Unable to create blood request. Please verify your details and try again.';
        setSubmitError(userMessage);
        setIsSubmitting(false);
        return;
      }

      // Success: use authoritative PostgreSQL UUID returned from API
      const dbRequest = result.request;

      const requestProfile: BloodRequest = {
        id: dbRequest.id,
        bloodGroup: d.bloodGroup,
        component: d.component,
        unitsNeeded: d.unitsNeeded,
        districtId: d.districtId,
        districtName: selectedDistrict?.name ?? d.districtId,
        approximateArea: d.approximateArea,
        hospitalName: d.hospitalName,
        requiredByDate: d.requiredByDate,
        requiredByTime: d.requiredByTime,
        urgency: d.urgency,
        notes: d.notes,
        status: 'open',
        locationLatitude: d.locationLatitude ?? null,
        locationLongitude: d.locationLongitude ?? null,
        createdAt: dbRequest.created_at || new Date().toISOString(),
        updatedAt: dbRequest.updated_at || new Date().toISOString(),
      };

      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            'hemo_match_active_request',
            JSON.stringify(requestProfile)
          );
        }
      } catch {
        console.warn('Unable to write request to localStorage');
      }

      // Navigate to matching demo page
      router.push('/requests/matching-demo');
    } catch {
      setSubmitError(
        'A network error occurred while submitting your blood request. Please check your connection and try again.'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-transparent text-neutral-900 dark:text-neutral-100 transition-colors duration-150 selection:bg-rose-100 dark:selection:bg-rose-950/50 selection:text-rose-900 dark:selection:text-rose-200 pb-28 md:pb-16">
      {/* Global App Header */}
      <AppHeader />

      {/* Main Container */}
      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        {/* Subtle ambient crimson radial wash */}
        <div
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[340px] -z-10 overflow-hidden opacity-30 dark:opacity-20 blur-3xl select-none"
          aria-hidden="true"
        >
          <div className="w-full h-full bg-[radial-gradient(ellipse_at_top,_rgba(225,29,72,0.16),rgba(225,29,72,0.03)_45%,transparent_70%)]" />
        </div>
        {/* Title & Introduction */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50/90 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/60 liquid-glass-pill shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400" />
              {isEditMode ? 'Requester Workspace • Step 1: Edit Request' : 'Requester Workspace • Step 1: Create Request'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
            {isEditMode ? 'Edit Blood Request' : 'Request Blood'}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1 max-w-2xl leading-relaxed">
            {isEditMode ? 'Update patient blood requirement or hospital facility. Matching volunteer donors will be re-evaluated deterministically.' : 'Specify patient blood requirement and hospital facility to privately match with eligible volunteer donors in your district.'}
          </p>
        </div>

        {isLocked && (
          <div role="alert" className="mb-6 p-5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/90 dark:bg-amber-950/40 text-neutral-900 dark:text-neutral-100 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center shrink-0 mt-0.5 text-amber-700 dark:text-amber-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">Request Editing Locked</h3>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                  {lockReason || "This blood request cannot be modified because volunteer donor coordination has already commenced."} Modifying clinical requirements or location at this stage would invalidate the active coordination.
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => router.push("/requests/matching-demo")}
                    className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-700 hover:bg-amber-800 text-white transition-colors cursor-pointer"
                  >
                    Return to Coordination Workspace
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/requests/new")}
                    className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:underline cursor-pointer"
                  >
                    Create New Request Instead
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Safety & Clinical Notice Banner */}
        <EmergencyBanner tone="notice" title="Safety & Clinical Notice" className="mb-8">
          Hemo Match facilitates preliminary district donor discovery and coordination only.
          Final donor eligibility, blood compatibility testing, and transfusion qualification
          must be confirmed by qualified hospital or blood-centre personnel.
        </EmergencyBanner>

        {/* Two-Column Responsive Layout */}
        <form onSubmit={handleSubmit} noValidate className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
          {/* LEFT COLUMN: Request Form (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Card 1: Blood Need */}
            <Card variant="default" glow="default" className="p-5 sm:p-7">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-4 pb-2 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-600 dark:bg-rose-500" />
                1. Required Blood Specification
              </h2>

              {/* A. Blood Group Selection */}
              <div className="mb-6" id="bloodGroup">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2">
                  Blood Group <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <div
                  role="radiogroup"
                  aria-label="Blood Group"
                  className="grid grid-cols-4 sm:grid-cols-8 gap-2"
                >
                  {VALID_BLOOD_GROUPS.map((bg) => {
                    const isSelected = formData.bloodGroup === bg;
                    return (
                      <button
                        key={bg}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => updateField('bloodGroup', bg)}
                        className={`h-12 rounded-xl text-sm font-bold transition-all duration-150 active:scale-95 flex items-center justify-center cursor-pointer border select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 ${
                          isSelected
                            ? 'bg-rose-600 text-white border-rose-600 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_2px_8px_-1px_rgba(225,29,72,0.4)] ring-2 ring-rose-500/30 dark:ring-rose-500/40 font-bold scale-[1.02]'
                            : 'liquid-glass-pill hover:bg-neutral-100/80 dark:hover:bg-white/5 text-neutral-800 dark:text-neutral-200 dark:hover:text-white border-neutral-200/80 dark:border-white/10 font-semibold shadow-xs'
                        }`}
                      >
                        <span className="tabular-nums">{bg}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.bloodGroup && (
                  <p role="alert" className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
                    {errors.bloodGroup}
                  </p>
                )}
              </div>

              {/* B. Component Needed */}
              <div className="mb-6" id="component">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2">
                  Component Needed <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <div
                  role="radiogroup"
                  aria-label="Component Needed"
                  className="grid grid-cols-2 gap-2.5 max-w-md"
                >
                  {VALID_BLOOD_COMPONENTS.map((comp) => {
                    const isSelected = formData.component === comp;
                    return (
                      <button
                        key={comp}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => updateField('component', comp)}
                        className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center justify-center text-center cursor-pointer border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${
                          isSelected
                            ? 'bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950 border-neutral-950 dark:border-white shadow-xs'
                            : 'liquid-glass-pill hover:bg-neutral-100/80 dark:hover:bg-white/5 text-neutral-700 dark:text-neutral-300 dark:hover:text-white border-neutral-200/80 dark:border-white/10 shadow-xs'
                        }`}
                      >
                        {comp}
                      </button>
                    );
                  })}
                </div>
                {errors.component && (
                  <p role="alert" className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
                    {errors.component}
                  </p>
                )}
              </div>

              {/* C. Quantity */}
              <div id="unitsNeeded">
                <label
                  htmlFor="unitsNeededInput"
                  className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2"
                >
                  Quantity (Units / Bags) <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <div className="relative max-w-xs">
                  <input
                    id="unitsNeededInput"
                    type="number"
                    min="1"
                    max="20"
                    step="1"
                    value={formData.unitsNeeded ?? ''}
                    onChange={(e) =>
                      updateField(
                        'unitsNeeded',
                        e.target.value === '' ? ('' as unknown as number) : Number(e.target.value)
                      )
                    }
                    className={`w-full h-11 px-3.5 pr-14 rounded-xl text-sm bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border transition-all focus:outline-none focus:ring-2 ${
                      errors.unitsNeeded
                        ? 'border-rose-500 focus:ring-rose-500/20 dark:border-rose-600'
                        : 'border-neutral-200 dark:border-neutral-700 focus:ring-rose-500/20 focus:border-rose-600'
                    }`}
                    placeholder="e.g. 2"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-neutral-400 dark:text-neutral-500 pointer-events-none">
                    Units
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                  Standard blood unit is approximately 350ml – 450ml.
                </p>
                {errors.unitsNeeded && (
                  <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                    {errors.unitsNeeded}
                  </p>
                )}
              </div>
            </Card>

            {/* Card 2: District & Location */}
            <Card variant="default" glow="default" className="p-5 sm:p-7">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-4 pb-2 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-600 dark:bg-rose-500" />
                2. District &amp; Location Context
              </h2>

              {/* Proximity Matching Location Control */}
              <div className="mb-5">
                <LocationCapture
                  context="requester"
                  value={
                    formData.locationLatitude != null && formData.locationLongitude != null
                      ? { latitude: formData.locationLatitude, longitude: formData.locationLongitude }
                      : null
                  }
                  onChange={(coords) => {
                    setFormData((prev) => ({
                      ...prev,
                      locationLatitude: coords?.latitude ?? null,
                      locationLongitude: coords?.longitude ?? null,
                    }));
                  }}
                />
              </div>

              {/* D. District Dropdown */}
              <div className="mb-5" id="districtId">
                <label
                  htmlFor="districtSelect"
                  className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2"
                >
                  District <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <select
                  id="districtSelect"
                  value={formData.districtId ?? ''}
                  onChange={(e) => updateField('districtId', e.target.value)}
                  className={`w-full h-11 px-3.5 rounded-xl text-sm bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border transition-all focus:outline-none focus:ring-2 cursor-pointer ${
                    errors.districtId
                      ? 'border-rose-500 focus:ring-rose-500/20 dark:border-rose-600'
                      : 'border-neutral-200 dark:border-neutral-700 focus:ring-rose-500/20 focus:border-rose-600'
                  }`}
                >
                  <option value="">Select a district...</option>
                  {DEMO_DISTRICTS.map((dist) => (
                    <option key={dist.id} value={dist.id}>
                      {dist.name} {dist.state ? `(${dist.state})` : ''}
                    </option>
                  ))}
                </select>
                {errors.districtId && (
                  <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                    {errors.districtId}
                  </p>
                )}
              </div>

              {/* E. Approximate Area */}
              <div className="mb-5" id="approximateArea">
                <label
                  htmlFor="approximateAreaInput"
                  className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2"
                >
                  Approximate Area / Locality <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <input
                  id="approximateAreaInput"
                  type="text"
                  value={formData.approximateArea ?? ''}
                  onChange={(e) => updateField('approximateArea', e.target.value)}
                  placeholder="e.g., Kaloor North, MG Road Sector, Town East"
                  className={`w-full h-11 px-3.5 rounded-xl text-sm bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border transition-all focus:outline-none focus:ring-2 ${
                    errors.approximateArea
                      ? 'border-rose-500 focus:ring-rose-500/20 dark:border-rose-600'
                      : 'border-neutral-200 dark:border-neutral-700 focus:ring-rose-500/20 focus:border-rose-600'
                  }`}
                />
                <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                  Please enter a neighbourhood or landmark only. Do not provide private home addresses.
                </p>
                {errors.approximateArea && (
                  <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                    {errors.approximateArea}
                  </p>
                )}
              </div>

              {/* F. Hospital Name */}
              <div id="hospitalName">
                <label
                  htmlFor="hospitalNameInput"
                  className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2"
                >
                  Hospital / Blood Centre <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <input
                  id="hospitalNameInput"
                  type="text"
                  value={formData.hospitalName ?? ''}
                  onChange={(e) => updateField('hospitalName', e.target.value)}
                  placeholder="e.g., General Hospital Blood Bank, City Medical Trust"
                  className={`w-full h-11 px-3.5 rounded-xl text-sm bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border transition-all focus:outline-none focus:ring-2 ${
                    errors.hospitalName
                      ? 'border-rose-500 focus:ring-rose-500/20 dark:border-rose-600'
                      : 'border-neutral-200 dark:border-neutral-700 focus:ring-rose-500/20 focus:border-rose-600'
                  }`}
                />
                {errors.hospitalName && (
                  <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                    {errors.hospitalName}
                  </p>
                )}
              </div>
            </Card>

            {/* Card 3: Urgency & Timing */}
            <Card variant="default" glow="default" className="p-5 sm:p-7">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-4 pb-2 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-600 dark:bg-rose-500" />
                3. Timing &amp; Urgency Tier
              </h2>

              {/* G. Required Date & Time */}
              <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div id="requiredByDate">
                  <label
                    htmlFor="requiredByDateInput"
                    className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2"
                  >
                    Required By Date <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>
                  <input
                    id="requiredByDateInput"
                    type="date"
                    value={formData.requiredByDate ?? ''}
                    onChange={(e) => updateField('requiredByDate', e.target.value)}
                    className={`w-full h-11 px-3.5 rounded-xl text-sm bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border transition-all focus:outline-none focus:ring-2 cursor-pointer ${
                      errors.requiredByDate
                        ? 'border-rose-500 focus:ring-rose-500/20 dark:border-rose-600'
                        : 'border-neutral-200 dark:border-neutral-700 focus:ring-rose-500/20 focus:border-rose-600'
                    }`}
                  />
                  {errors.requiredByDate && (
                    <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                      {errors.requiredByDate}
                    </p>
                  )}
                </div>

                <div id="requiredByTime">
                  <label
                    htmlFor="requiredByTimeInput"
                    className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2"
                  >
                    Required By Time <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>
                  <input
                    id="requiredByTimeInput"
                    type="time"
                    value={formData.requiredByTime ?? ''}
                    onChange={(e) => updateField('requiredByTime', e.target.value)}
                    className={`w-full h-11 px-3.5 rounded-xl text-sm bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border transition-all focus:outline-none focus:ring-2 cursor-pointer ${
                      errors.requiredByTime
                        ? 'border-rose-500 focus:ring-rose-500/20 dark:border-rose-600'
                        : 'border-neutral-200 dark:border-neutral-700 focus:ring-rose-500/20 focus:border-rose-600'
                    }`}
                  />
                  {errors.requiredByTime && (
                    <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                      {errors.requiredByTime}
                    </p>
                  )}
                </div>
              </div>

              {/* H. Urgency Cards (Calm Urgency, No pinging) */}
              <div id="urgency">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2">
                  Urgency Level <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <div
                  role="radiogroup"
                  aria-label="Urgency Level"
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                >
                  {/* Critical */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={formData.urgency === 'critical'}
                    onClick={() => updateField('urgency', 'critical')}
                    className={`p-4 rounded-2xl text-left border transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 ${
                      formData.urgency === 'critical'
                        ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-500 dark:border-rose-600 ring-2 ring-rose-500/20'
                        : 'liquid-glass hover:border-neutral-300 dark:hover:border-neutral-700 border-neutral-200/80 dark:border-white/10 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-rose-700 dark:text-rose-400">Critical</span>
                      <span className="w-2 h-2 rounded-full bg-rose-600 dark:bg-rose-500" />
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">Immediate emergency requirement</p>
                  </button>

                  {/* Urgent */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={formData.urgency === 'urgent'}
                    onClick={() => updateField('urgency', 'urgent')}
                    className={`p-4 rounded-2xl text-left border transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 ${
                      formData.urgency === 'urgent'
                        ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-500 dark:border-amber-600 ring-2 ring-amber-500/20'
                        : 'liquid-glass hover:border-neutral-300 dark:hover:border-neutral-700 border-neutral-200/80 dark:border-white/10 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-amber-700 dark:text-amber-400">Urgent</span>
                      <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400" />
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">Needed within 12–24 hours</p>
                  </button>

                  {/* Routine */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={formData.urgency === 'routine'}
                    onClick={() => updateField('urgency', 'routine')}
                    className={`p-4 rounded-2xl text-left border transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${
                      formData.urgency === 'routine'
                        ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-400 dark:border-neutral-600 ring-2 ring-neutral-400/20'
                        : 'liquid-glass hover:border-neutral-300 dark:hover:border-neutral-700 border-neutral-200/80 dark:border-white/10 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Routine</span>
                      <span className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-500" />
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">Scheduled within 24+ hours</p>
                  </button>
                </div>
                {errors.urgency && (
                  <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                    {errors.urgency}
                  </p>
                )}
              </div>
            </Card>

            {/* Card 4: Coordination Notes */}
            <Card variant="default" glow="default" className="p-5 sm:p-7">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-500" />
                4. Coordination Notes (Optional)
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                Add practical hospital details such as specific counter or wing.
                <strong className="text-neutral-700 dark:text-neutral-300 block mt-0.5">
                  Do not include patient names, personal phone numbers, or private medical details.
                </strong>
              </p>

              <textarea
                rows={3}
                id="notes"
                value={formData.notes ?? ''}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="e.g., Replacement donation requested at Blood Bank counter B."
                className="w-full p-3.5 rounded-xl text-sm bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 focus:outline-none resize-y"
              />
            </Card>
          </div>

          {/* RIGHT COLUMN: Live Request Summary & Sticky Action (4 cols) */}
          <div className="lg:col-span-4 mt-6 lg:mt-0 space-y-4 lg:sticky lg:top-24">
            <GlowSurface variant="elevated" className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl liquid-glass-elevated shadow-sm border border-neutral-200/80 dark:border-white/10">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800/80 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Request Preview
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    formData.urgency === 'critical'
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                      : formData.urgency === 'urgent'
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                      : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  {formData.urgency?.toUpperCase() ?? 'URGENT'}
                </span>
              </div>

              {/* Live Spec Card */}
              <div className="space-y-3 text-xs mb-5">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Blood Need:</span>
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-rose-600 dark:text-rose-500 text-sm">
                      {formData.bloodGroup || 'Not selected'}
                    </span>
                    <span className="text-neutral-700 dark:text-neutral-300">
                      • {formData.component}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Quantity:</span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {formData.unitsNeeded || 1} {Number(formData.unitsNeeded) === 1 ? 'Unit' : 'Units'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">District:</span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-right truncate max-w-[160px]">
                    {selectedDistrict?.name || 'Not selected'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Hospital:</span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-right truncate max-w-[160px]">
                    {formData.hospitalName || 'Not specified'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Required By:</span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-right">
                    {formattedRequiredTime}
                  </span>
                </div>
              </div>

              {/* Privacy Shield Info */}
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200/70 dark:border-neutral-700 text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed mb-5 flex items-start gap-2">
                <svg
                  className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                  />
                </svg>
                <span>
                  Donor contact numbers stay private during matching and are only unlocked after volunteer
                  acceptance and explicit requester reveal.
                </span>
              </div>

              {/* Submit Error Banner */}
              {submitError && (
                <div
                  role="alert"
                  className="mb-4 p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/90 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5"
                >
                  <svg
                    className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                    />
                  </svg>
                  <div>
                    <p className="font-bold">Request Submission Error</p>
                    <p className="mt-0.5 text-rose-700 dark:text-rose-400 leading-normal">{submitError}</p>
                  </div>
                </div>
              )}

              {/* Submission Button */}
              <button
                type="submit"
                id="find-matching-donors-btn"
                disabled={isSubmitting || isLocked}
                className="w-full py-3.5 px-4 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-bold text-sm transition-all duration-150 shadow-xs hover:shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                      />
                    </svg>
                    <span>{isEditMode ? 'Save Changes & Re-evaluate' : 'Find Matching Donors'}</span>
                  </>
                )}
              </button>

              <p className="text-center text-[11px] text-neutral-400 dark:text-neutral-500 mt-2.5">
                Saved securely to district coordination records.
              </p>
            </GlowSurface>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function NewBloodRequestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-transparent" />}>
      <BloodRequestFormContent />
    </Suspense>
  );
}
