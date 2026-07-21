import { useState } from 'react';
import {
    settingsGhostBorder,
    settingsGhostButtonClass,
    settingsInputClass,
    settingsInputStyle,
    settingsPrimaryButtonClass,
    settingsPrimaryButtonStyle
} from './settings-card';

export type IntegrationProviderValue = 'azure_devops' | 'github';

export type IntegrationFormValues = {
    provider: IntegrationProviderValue;
    name: string;
    /** PAT. On edit, leaving this blank keeps the stored token. */
    token: string;
    organization: string;
    project: string;
    workItemType: string;
    /** On-prem Azure DevOps Server / TFS host; blank = the dev.azure.com cloud. */
    baseUrl: string;
    defaultRepo: string;
};

export type IntegrationSubmitValues = {
    provider: IntegrationProviderValue;
    name: string;
    token?: string;
    organization?: string;
    project?: string;
    work_item_type?: string;
    base_url?: string;
    default_repo?: string;
};

type IntegrationFormProps = {
    initial: IntegrationFormValues;
    submitLabel: string;
    pending: boolean;
    /** Edit mode: provider is fixed and the PAT can be left blank to keep it. */
    isEdit?: boolean;
    onSubmit: (values: IntegrationSubmitValues) => void;
    onCancel: () => void;
};

const isRepo = (value: string): boolean => {
    const parts = value.trim().split('/');
    return parts.length === 2 && parts.every((p) => p.length > 0);
};

// A base URL, when given, must carry an http(s) scheme (the backend joins it
// with the org/project path segments). Blank is allowed — it means the cloud.
const isBaseUrl = (value: string): boolean => {
    const v = value.trim();
    return !v || v.startsWith('http://') || v.startsWith('https://');
};

const labelClass = 'mb-1.5 block text-[11.5px]';
const labelStyle = { color: '#9a8f81' } as const;

/**
 * Inline form for creating/editing an Azure DevOps or GitHub connection. Both
 * providers authenticate with a user-supplied PAT. Azure DevOps needs an
 * organization + project; GitHub takes an optional "owner/repo" publish target.
 */
export const IntegrationForm = ({
    initial,
    submitLabel,
    pending,
    isEdit = false,
    onSubmit,
    onCancel
}: IntegrationFormProps) => {
    const [values, setValues] = useState<IntegrationFormValues>(initial);
    const [touched, setTouched] = useState(false);

    const isAzure = values.provider === 'azure_devops';
    const set = (patch: Partial<IntegrationFormValues>) =>
        setValues((prev) => ({ ...prev, ...patch }));

    const nameValid = values.name.trim().length > 0;
    const tokenValid = isEdit || values.token.trim().length > 0;
    const orgValid = !isAzure || values.organization.trim().length > 0;
    const projectValid = !isAzure || values.project.trim().length > 0;
    const baseUrlValid = !isAzure || isBaseUrl(values.baseUrl);
    const repoValid = isAzure || !values.defaultRepo.trim() || isRepo(values.defaultRepo);
    const canSubmit =
        nameValid &&
        tokenValid &&
        orgValid &&
        projectValid &&
        baseUrlValid &&
        repoValid &&
        !pending;

    const handleSubmit = () => {
        setTouched(true);
        if (!canSubmit) return;

        const out: IntegrationSubmitValues = {
            provider: values.provider,
            name: values.name.trim()
        };
        // Only send the token when the user actually entered one (blank on edit
        // means "keep the stored PAT").
        if (values.token.trim()) out.token = values.token.trim();
        if (isAzure) {
            out.organization = values.organization.trim();
            out.project = values.project.trim();
            out.work_item_type = values.workItemType.trim() || undefined;
            out.base_url = values.baseUrl.trim() || undefined;
        } else {
            out.default_repo = values.defaultRepo.trim() || undefined;
        }
        onSubmit(out);
    };

    return (
        <div
            className='rounded-[10px] border border-dashed p-3.5'
            style={{ borderColor: 'rgba(255,255,255,.12)' }}
        >
            {!isEdit && (
                <div className='mb-3 flex gap-2'>
                    {(
                        [
                            ['azure_devops', 'Azure DevOps'],
                            ['github', 'GitHub']
                        ] as const
                    ).map(([value, label]) => {
                        const active = values.provider === value;
                        return (
                            <button
                                key={value}
                                type='button'
                                onClick={() => set({ provider: value })}
                                className='rounded-[8px] border px-3 py-1.5 text-[12.5px] transition-colors'
                                style={{
                                    borderColor: active
                                        ? 'rgba(120,168,205,.5)'
                                        : 'rgba(255,255,255,.12)',
                                    backgroundColor: active
                                        ? 'rgba(120,168,205,.12)'
                                        : 'transparent',
                                    color: active
                                        ? 'var(--color-text-primary)'
                                        : 'var(--color-text-muted)'
                                }}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            )}

            <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                <label>
                    <span className={labelClass} style={labelStyle}>
                        Name
                    </span>
                    <input
                        type='text'
                        value={values.name}
                        onChange={(e) => set({ name: e.target.value })}
                        placeholder={isAzure ? 'e.g. Contoso ADO' : 'e.g. My GitHub'}
                        autoFocus
                        className={settingsInputClass}
                        style={settingsInputStyle}
                    />
                    {touched && !nameValid && (
                        <span className='mt-1 block text-[11px] text-danger'>
                            Name is required
                        </span>
                    )}
                </label>
                <label>
                    <span className={labelClass} style={labelStyle}>
                        Personal access token{isEdit ? ' (leave blank to keep)' : ''}
                    </span>
                    <input
                        type='password'
                        value={values.token}
                        onChange={(e) => set({ token: e.target.value })}
                        placeholder={isEdit ? '••••••••' : 'Paste your PAT'}
                        autoComplete='off'
                        className={`${settingsInputClass} font-mono text-[12.5px]`}
                        style={settingsInputStyle}
                    />
                    {touched && !tokenValid && (
                        <span className='mt-1 block text-[11px] text-danger'>
                            A personal access token is required
                        </span>
                    )}
                </label>

                {isAzure ? (
                    <>
                        <label>
                            <span className={labelClass} style={labelStyle}>
                                Organization / collection
                            </span>
                            <input
                                type='text'
                                value={values.organization}
                                onChange={(e) => set({ organization: e.target.value })}
                                placeholder='e.g. contoso'
                                className={settingsInputClass}
                                style={settingsInputStyle}
                            />
                            {touched && !orgValid && (
                                <span className='mt-1 block text-[11px] text-danger'>
                                    Organization is required
                                </span>
                            )}
                        </label>
                        <label>
                            <span className={labelClass} style={labelStyle}>
                                Project
                            </span>
                            <input
                                type='text'
                                value={values.project}
                                onChange={(e) => set({ project: e.target.value })}
                                placeholder='e.g. Payments'
                                className={settingsInputClass}
                                style={settingsInputStyle}
                            />
                            {touched && !projectValid && (
                                <span className='mt-1 block text-[11px] text-danger'>
                                    Project is required
                                </span>
                            )}
                        </label>
                        <label className='md:col-span-2'>
                            <span className={labelClass} style={labelStyle}>
                                Work item type for publishing (optional)
                            </span>
                            <input
                                type='text'
                                value={values.workItemType}
                                onChange={(e) => set({ workItemType: e.target.value })}
                                placeholder='Task'
                                className={settingsInputClass}
                                style={settingsInputStyle}
                            />
                        </label>
                        <label className='md:col-span-2'>
                            <span className={labelClass} style={labelStyle}>
                                Server URL (on-prem only)
                            </span>
                            <input
                                type='text'
                                value={values.baseUrl}
                                onChange={(e) => set({ baseUrl: e.target.value })}
                                placeholder='https://dev.azure.com'
                                className={`${settingsInputClass} font-mono text-[12.5px]`}
                                style={settingsInputStyle}
                            />
                            <span className='mt-1 block text-[11px] text-text-faint'>
                                Host of an on-prem Azure DevOps Server / TFS, e.g.{' '}
                                <span className='font-mono'>https://tfs.example.com</span>. Leave
                                blank for the dev.azure.com cloud.
                            </span>
                            {touched && !baseUrlValid && (
                                <span className='mt-1 block text-[11px] text-danger'>
                                    Must start with http:// or https://
                                </span>
                            )}
                        </label>
                    </>
                ) : (
                    <label className='md:col-span-2'>
                        <span className={labelClass} style={labelStyle}>
                            Default repository for publishing (optional)
                        </span>
                        <input
                            type='text'
                            value={values.defaultRepo}
                            onChange={(e) => set({ defaultRepo: e.target.value })}
                            placeholder='owner/repo'
                            className={`${settingsInputClass} font-mono text-[12.5px]`}
                            style={settingsInputStyle}
                        />
                        {touched && !repoValid && (
                            <span className='mt-1 block text-[11px] text-danger'>
                                Use the form "owner/repo"
                            </span>
                        )}
                    </label>
                )}
            </div>

            <div className='mt-3 flex items-center justify-end gap-1.5'>
                <button
                    type='button'
                    onClick={handleSubmit}
                    disabled={pending}
                    className={settingsPrimaryButtonClass}
                    style={settingsPrimaryButtonStyle}
                >
                    {submitLabel}
                </button>
                <button
                    type='button'
                    onClick={onCancel}
                    className={settingsGhostButtonClass}
                    style={{ borderColor: settingsGhostBorder }}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};
