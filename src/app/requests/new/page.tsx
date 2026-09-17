'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type BloodRequest, DEMO_DISTRICTS } from '@/types';
import {
  VALID_BLOOD_GROUPS,
  VALID_BLOOD_COMPONENTS,
  validateBloodRequest,
  type BloodRequestFormData,
} from '@/lib/validation';

export default function NewBloodRequestPage() {
  const router = useRouter();

  // Form State
  const [formData, setFormData] = useState<Partial<BloodRequestFormData>>({
    bloodGroup: undefined,
    component: 'Whole Blood',
    unitsNeeded: 1,
    districtId: '',
    approximateArea: '',
    hospitalName: '',
    requiredByDate: '',
    requiredByTime: '',
    urgency: 'urgent',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Field change helper
  const updateField = <K extends keyof BloodRequestFormData>(
    field: K,
    value: BloodRequestFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for that field on change
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const validation = validateBloodRequest(formData);

    if (!validation.isValid || !validation.data) {
      setErrors(validation.errors);
      setIsSubmitting(false);

      // Scroll to the first error
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

    // Prepare temporary client request object
    const selectedDistrict = DEMO_DISTRICTS.find(
      (d) => d.id === validation.data?.districtId
    );

    const temporaryRequest: BloodRequest = {
      id: `req-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      bloodGroup: validation.data.bloodGroup,
      component: validation.data.component,
      unitsNeeded: validation.data.unitsNeeded,
      districtId: validation.data.districtId,
      districtName: selectedDistrict?.name ?? validation.data.districtId,
      approximateArea: validation.data.approximateArea,
      hospitalName: validation.data.hospitalName,
      requiredByDate: validation.data.requiredByDate,
      requiredByTime: validation.data.requiredByTime,
      urgency: validation.data.urgency,
      notes: validation.data.notes,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      // Store in client-side localStorage for the matching demo page
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          'hemo_match_active_request',
          JSON.stringify(temporaryRequest)
        );
      }
    } catch {
      // Graceful fallback if storage fails
      console.warn('Unable to write request to localStorage');
    }

    // Navigate to matching demo page
    router.push('/requests/matching-demo');
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-900 selection:bg-rose-100 selection:text-rose-900 pb-20">
      {/* Header */}
      <header className="w-full border-b border-neutral-200/70 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-950 transition-colors py-2 pr-3 -ml-2 rounded-lg"
          >
            <svg
              className="w-4 h-4 text-neutral-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
            Back to Home
          </Link>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              New Blood Request
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        {/* Title & Introductory Context */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 mb-2">
            Request Blood
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
            Create an urgent requirement to match with potentially eligible,
            verified donors in your district. Your request will prioritize local
            proximity while protecting donor contact privacy.
          </p>
        </div>

        {/* Safety & Clinical Trust Banner */}
        <div className="rounded-2xl bg-amber-50/70 border border-amber-200/80 p-4 sm:p-5 mb-8 flex items-start gap-3.5 shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-800 mt-0.5">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.002A11.959 11.959 0 0 1 12 2.964ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
          <div className="text-xs sm:text-sm text-amber-900/90 leading-relaxed">
            <strong className="font-semibold text-amber-950 block mb-1">
              Safety &amp; Clinical Notice
            </strong>
            Hemo Match helps connect blood requests with potentially eligible
            nearby donors. Final donor eligibility, blood compatibility, and
            transfusion decisions must be confirmed by qualified blood-centre or
            clinical personnel.
          </div>
        </div>

        {/* Request Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Card 1: Blood & Component Details */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-7 shadow-xs">
            <h2 className="text-base font-semibold text-neutral-900 mb-4 pb-2 border-b border-neutral-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Required Blood Specification
            </h2>

            {/* A. Blood Group Selection */}
            <div className="mb-6" id="bloodGroup">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2">
                Blood Group <span className="text-rose-600">*</span>
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
                      className={`h-12 rounded-xl text-sm font-semibold transition-all duration-150 flex items-center justify-center cursor-pointer border ${
                        isSelected
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-600/30'
                          : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200/90'
                      }`}
                    >
                      {bg}
                    </button>
                  );
                })}
              </div>
              {errors.bloodGroup && (
                <p role="alert" className="mt-2 text-xs font-medium text-rose-600">
                  {errors.bloodGroup}
                </p>
              )}
            </div>

            {/* B. Component Needed */}
            <div className="mb-6" id="component">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2">
                Component Needed <span className="text-rose-600">*</span>
              </label>
              <div
                role="radiogroup"
                aria-label="Component Needed"
                className="grid grid-cols-2 sm:grid-cols-4 gap-2"
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
                      className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 flex items-center justify-center text-center cursor-pointer border ${
                        isSelected
                          ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                          : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200/90'
                      }`}
                    >
                      {comp}
                    </button>
                  );
                })}
              </div>
              {errors.component && (
                <p role="alert" className="mt-2 text-xs font-medium text-rose-600">
                  {errors.component}
                </p>
              )}
            </div>

            {/* C. Quantity */}
            <div id="unitsNeeded">
              <label
                htmlFor="unitsNeededInput"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2"
              >
                Quantity (Units / Bags) <span className="text-rose-600">*</span>
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
                  className={`w-full h-11 px-3.5 pr-14 rounded-xl text-sm bg-neutral-50 border transition-all focus:outline-none focus:ring-2 ${
                    errors.unitsNeeded
                      ? 'border-rose-500 focus:ring-rose-500/20'
                      : 'border-neutral-200 focus:ring-rose-500/20 focus:border-rose-600'
                  }`}
                  placeholder="e.g. 2"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-neutral-400 pointer-events-none">
                  Units
                </span>
              </div>
              <p className="mt-1.5 text-xs text-neutral-500">
                Standard whole blood unit is approx. 350ml - 450ml.
              </p>
              {errors.unitsNeeded && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">
                  {errors.unitsNeeded}
                </p>
              )}
            </div>
          </div>

          {/* Card 2: Location & Destination */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-7 shadow-xs">
            <h2 className="text-base font-semibold text-neutral-900 mb-4 pb-2 border-b border-neutral-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              District &amp; Location
            </h2>

            {/* D. District Dropdown */}
            <div className="mb-5" id="districtId">
              <label
                htmlFor="districtSelect"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2"
              >
                District <span className="text-rose-600">*</span>
              </label>
              <select
                id="districtSelect"
                value={formData.districtId ?? ''}
                onChange={(e) => updateField('districtId', e.target.value)}
                className={`w-full h-11 px-3.5 rounded-xl text-sm bg-neutral-50 border transition-all focus:outline-none focus:ring-2 cursor-pointer ${
                  errors.districtId
                    ? 'border-rose-500 focus:ring-rose-500/20'
                    : 'border-neutral-200 focus:ring-rose-500/20 focus:border-rose-600'
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
                <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">
                  {errors.districtId}
                </p>
              )}
            </div>

            {/* E. Approximate Area / Locality */}
            <div className="mb-5" id="approximateArea">
              <label
                htmlFor="approximateAreaInput"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2"
              >
                Approximate Area / Locality <span className="text-rose-600">*</span>
              </label>
              <input
                id="approximateAreaInput"
                type="text"
                value={formData.approximateArea ?? ''}
                onChange={(e) => updateField('approximateArea', e.target.value)}
                placeholder="e.g., Kaloor North, MG Road Sector, Town East"
                className={`w-full h-11 px-3.5 rounded-xl text-sm bg-neutral-50 border transition-all focus:outline-none focus:ring-2 ${
                  errors.approximateArea
                    ? 'border-rose-500 focus:ring-rose-500/20'
                    : 'border-neutral-200 focus:ring-rose-500/20 focus:border-rose-600'
                }`}
              />
              <p className="mt-1.5 text-xs text-neutral-500">
                Please enter a neighbourhood or landmark only. Do not provide private home addresses.
              </p>
              {errors.approximateArea && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">
                  {errors.approximateArea}
                </p>
              )}
            </div>

            {/* F. Hospital / Blood Centre */}
            <div id="hospitalName">
              <label
                htmlFor="hospitalNameInput"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2"
              >
                Hospital / Blood Centre <span className="text-rose-600">*</span>
              </label>
              <input
                id="hospitalNameInput"
                type="text"
                value={formData.hospitalName ?? ''}
                onChange={(e) => updateField('hospitalName', e.target.value)}
                placeholder="e.g., General Hospital Blood Bank, City Medical Trust"
                className={`w-full h-11 px-3.5 rounded-xl text-sm bg-neutral-50 border transition-all focus:outline-none focus:ring-2 ${
                  errors.hospitalName
                    ? 'border-rose-500 focus:ring-rose-500/20'
                    : 'border-neutral-200 focus:ring-rose-500/20 focus:border-rose-600'
                }`}
              />
              {errors.hospitalName && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">
                  {errors.hospitalName}
                </p>
              )}
            </div>
          </div>

          {/* Card 3: Urgency & Timing */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-7 shadow-xs">
            <h2 className="text-base font-semibold text-neutral-900 mb-4 pb-2 border-b border-neutral-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Timing &amp; Urgency Tier
            </h2>

            {/* G. Required By Date and Time */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div id="requiredByDate">
                <label
                  htmlFor="requiredByDateInput"
                  className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2"
                >
                  Required By Date <span className="text-rose-600">*</span>
                </label>
                <input
                  id="requiredByDateInput"
                  type="date"
                  value={formData.requiredByDate ?? ''}
                  onChange={(e) => updateField('requiredByDate', e.target.value)}
                  className={`w-full h-11 px-3.5 rounded-xl text-sm bg-neutral-50 border transition-all focus:outline-none focus:ring-2 cursor-pointer ${
                    errors.requiredByDate
                      ? 'border-rose-500 focus:ring-rose-500/20'
                      : 'border-neutral-200 focus:ring-rose-500/20 focus:border-rose-600'
                  }`}
                />
                {errors.requiredByDate && (
                  <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">
                    {errors.requiredByDate}
                  </p>
                )}
              </div>

              <div id="requiredByTime">
                <label
                  htmlFor="requiredByTimeInput"
                  className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2"
                >
                  Required By Time <span className="text-rose-600">*</span>
                </label>
                <input
                  id="requiredByTimeInput"
                  type="time"
                  value={formData.requiredByTime ?? ''}
                  onChange={(e) => updateField('requiredByTime', e.target.value)}
                  className={`w-full h-11 px-3.5 rounded-xl text-sm bg-neutral-50 border transition-all focus:outline-none focus:ring-2 cursor-pointer ${
                    errors.requiredByTime
                      ? 'border-rose-500 focus:ring-rose-500/20'
                      : 'border-neutral-200 focus:ring-rose-500/20 focus:border-rose-600'
                  }`}
                />
                {errors.requiredByTime && (
                  <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">
                    {errors.requiredByTime}
                  </p>
                )}
              </div>
            </div>

            {/* H. Urgency Cards */}
            <div id="urgency">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2">
                Urgency Level <span className="text-rose-600">*</span>
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
                  className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                    formData.urgency === 'critical'
                      ? 'bg-rose-50/80 border-rose-500 ring-2 ring-rose-500/20'
                      : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200/90'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-rose-700">Critical</span>
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                  </div>
                  <p className="text-xs text-neutral-600">Immediate emergency / surgery</p>
                </button>

                {/* Urgent */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={formData.urgency === 'urgent'}
                  onClick={() => updateField('urgency', 'urgent')}
                  className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                    formData.urgency === 'urgent'
                      ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20'
                      : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200/90'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-amber-700">Urgent</span>
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                  </div>
                  <p className="text-xs text-neutral-600">Needed within 12–24 hours</p>
                </button>

                {/* Routine */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={formData.urgency === 'routine'}
                  onClick={() => updateField('urgency', 'routine')}
                  className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                    formData.urgency === 'routine'
                      ? 'bg-neutral-100 border-neutral-400 ring-2 ring-neutral-400/20'
                      : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200/90'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-neutral-800">Routine</span>
                    <span className="w-2 h-2 rounded-full bg-neutral-400" />
                  </div>
                  <p className="text-xs text-neutral-600">Scheduled within 24+ hours</p>
                </button>
              </div>
              {errors.urgency && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">
                  {errors.urgency}
                </p>
              )}
            </div>
          </div>

          {/* Card 4: Optional Note & Privacy Guard */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-7 shadow-xs">
            <h2 className="text-base font-semibold text-neutral-900 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neutral-400" />
              Coordination Notes (Optional)
            </h2>
            <p className="text-xs text-neutral-500 mb-4">
              Add logistical details such as specific hospital wing or blood bank counter.
              <strong className="text-neutral-700 block mt-0.5">
                Do not include patient names, personal phone numbers, or private medical details.
              </strong>
            </p>

            <textarea
              rows={3}
              id="notes"
              value={formData.notes ?? ''}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="e.g., Replacement donation requested at Blood Bank counter B."
              className="w-full p-3.5 rounded-xl text-sm bg-neutral-50 border border-neutral-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 focus:outline-none resize-y"
            />
          </div>

          {/* Submission Action */}
          <div className="pt-2">
            <button
              type="submit"
              id="find-matching-donors-btn"
              disabled={isSubmitting}
              className="w-full py-4 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-semibold text-base transition-all duration-150 shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
              Find Matching Donors
            </button>
            <p className="text-center text-xs text-neutral-400 mt-3">
              Request will be processed in temporary local matching demo mode.
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
