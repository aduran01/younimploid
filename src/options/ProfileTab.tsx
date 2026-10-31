import { useEffect, useState, type ReactNode } from 'react';
import {
  defaultProfile,
  getProfile,
  saveProfile,
  type Address,
  type EducationEntry,
  type Profile,
  type WorkHistoryEntry,
} from '../shared/storage/profile';
import { Button } from '../shared/ui/Button';
import { EEO_OPTIONS, WORK_AUTHORIZATION_OPTIONS } from './answerOptions';
import { AnswerSelect, TextAreaField, TextField } from './fields';
import { validateProfile } from './validation';

const EMPTY_WORK: WorkHistoryEntry = {
  employer: '',
  title: '',
  location: '',
  startDate: '',
  endDate: '',
  current: false,
  description: '',
};

const EMPTY_EDUCATION: EducationEntry = {
  school: '',
  degree: '',
  fieldOfStudy: '',
  startDate: '',
  endDate: '',
};

const ADDRESS_FIELDS: [keyof Address, string][] = [
  ['line1', 'Address line 1'],
  ['line2', 'Address line 2'],
  ['city', 'City'],
  ['region', 'State or region'],
  ['postalCode', 'Postal code'],
  ['country', 'Country'],
];

function replaceAt<T>(items: T[], index: number, patch: Partial<T>): T[] {
  return items.map((item, position) => (position === index ? { ...item, ...patch } : item));
}

function removeAt<T>(items: T[], index: number): T[] {
  return items.filter((_, position) => position !== index);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

const GRID = 'grid gap-3 sm:grid-cols-2';
const ENTRY = 'space-y-3 rounded border border-gray-300 p-3';

export function ProfileTab() {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    void getProfile().then((stored) => {
      setProfile(stored);
      setLoaded(true);
    });
  }, []);

  const errors = validateProfile(profile);
  const hasErrors = Object.keys(errors).length > 0;
  const update = (patch: Partial<Profile>) => {
    setProfile((current) => ({ ...current, ...patch }));
    setSaveStatus('');
  };

  if (!loaded) return <p>Loading...</p>;

  return (
    <form
      className="space-y-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (hasErrors) return;
        saveProfile(profile).then(
          () => setSaveStatus('Saved.'),
          () => setSaveStatus('Could not save your profile.'),
        );
      }}
    >
      <Section title="Contact">
        <div className={GRID}>
          <TextField
            label="First name"
            value={profile.firstName}
            onChange={(firstName) => update({ firstName })}
          />
          <TextField
            label="Last name"
            value={profile.lastName}
            onChange={(lastName) => update({ lastName })}
          />
          <TextField
            label="Email"
            type="email"
            value={profile.email}
            error={errors.email}
            onChange={(email) => update({ email })}
          />
          <TextField
            label="Phone"
            type="tel"
            value={profile.phone}
            error={errors.phone}
            onChange={(phone) => update({ phone })}
          />
        </div>
      </Section>

      <Section title="Address">
        <div className={GRID}>
          {ADDRESS_FIELDS.map(([field, label]) => (
            <TextField
              key={field}
              label={label}
              value={profile.address[field]}
              onChange={(value) => update({ address: { ...profile.address, [field]: value } })}
            />
          ))}
        </div>
      </Section>

      <Section title="Links">
        {profile.links.map((link, index) => (
          <div key={index} className={ENTRY}>
            <div className={GRID}>
              <TextField
                label="Label"
                value={link.label}
                onChange={(label) => update({ links: replaceAt(profile.links, index, { label }) })}
              />
              <TextField
                label="URL"
                type="url"
                value={link.url}
                error={errors[`links.${index}.url`]}
                onChange={(url) => update({ links: replaceAt(profile.links, index, { url }) })}
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => update({ links: removeAt(profile.links, index) })}
            >
              Remove link
            </Button>
          </div>
        ))}
        <Button
          variant="secondary"
          onClick={() => update({ links: [...profile.links, { label: '', url: '' }] })}
        >
          Add link
        </Button>
      </Section>

      <Section title="Work history">
        {profile.workHistory.map((entry, index) => {
          const patch = (change: Partial<WorkHistoryEntry>) =>
            update({ workHistory: replaceAt(profile.workHistory, index, change) });
          return (
            <div key={index} className={ENTRY}>
              <div className={GRID}>
                <TextField
                  label="Employer"
                  value={entry.employer}
                  error={errors[`workHistory.${index}.employer`]}
                  onChange={(employer) => patch({ employer })}
                />
                <TextField
                  label="Title"
                  value={entry.title}
                  error={errors[`workHistory.${index}.title`]}
                  onChange={(title) => patch({ title })}
                />
                <TextField
                  label="Location"
                  value={entry.location}
                  onChange={(location) => patch({ location })}
                />
                <label className="flex items-center gap-2 self-end text-sm">
                  <input
                    type="checkbox"
                    checked={entry.current}
                    onChange={(event) => patch({ current: event.target.checked })}
                  />
                  I currently work here
                </label>
                <TextField
                  label="Start date"
                  type="month"
                  value={entry.startDate}
                  onChange={(startDate) => patch({ startDate })}
                />
                {!entry.current && (
                  <TextField
                    label="End date"
                    type="month"
                    value={entry.endDate}
                    error={errors[`workHistory.${index}.endDate`]}
                    onChange={(endDate) => patch({ endDate })}
                  />
                )}
              </div>
              <TextAreaField
                label="Description"
                value={entry.description}
                onChange={(description) => patch({ description })}
              />
              <Button
                variant="secondary"
                onClick={() => update({ workHistory: removeAt(profile.workHistory, index) })}
              >
                Remove job
              </Button>
            </div>
          );
        })}
        <Button
          variant="secondary"
          onClick={() => update({ workHistory: [...profile.workHistory, EMPTY_WORK] })}
        >
          Add job
        </Button>
      </Section>

      <Section title="Education">
        {profile.education.map((entry, index) => {
          const patch = (change: Partial<EducationEntry>) =>
            update({ education: replaceAt(profile.education, index, change) });
          return (
            <div key={index} className={ENTRY}>
              <div className={GRID}>
                <TextField
                  label="School"
                  value={entry.school}
                  error={errors[`education.${index}.school`]}
                  onChange={(school) => patch({ school })}
                />
                <TextField
                  label="Degree"
                  value={entry.degree}
                  onChange={(degree) => patch({ degree })}
                />
                <TextField
                  label="Field of study"
                  value={entry.fieldOfStudy}
                  onChange={(fieldOfStudy) => patch({ fieldOfStudy })}
                />
                <span />
                <TextField
                  label="Start date"
                  type="month"
                  value={entry.startDate}
                  onChange={(startDate) => patch({ startDate })}
                />
                <TextField
                  label="End date"
                  type="month"
                  value={entry.endDate}
                  error={errors[`education.${index}.endDate`]}
                  onChange={(endDate) => patch({ endDate })}
                />
              </div>
              <Button
                variant="secondary"
                onClick={() => update({ education: removeAt(profile.education, index) })}
              >
                Remove school
              </Button>
            </div>
          );
        })}
        <Button
          variant="secondary"
          onClick={() => update({ education: [...profile.education, EMPTY_EDUCATION] })}
        >
          Add school
        </Button>
      </Section>

      <Section title="Work authorization and EEO">
        <p className="text-sm text-gray-600">
          These answers are only used where a form asks for them.
        </p>
        <div className={GRID}>
          <AnswerSelect
            label="Authorized to work in this country"
            value={profile.workAuthorization.authorizedToWork}
            options={WORK_AUTHORIZATION_OPTIONS.authorizedToWork}
            onChange={(authorizedToWork) =>
              update({ workAuthorization: { ...profile.workAuthorization, authorizedToWork } })
            }
          />
          <AnswerSelect
            label="Requires visa sponsorship"
            value={profile.workAuthorization.requiresSponsorship}
            options={WORK_AUTHORIZATION_OPTIONS.requiresSponsorship}
            onChange={(requiresSponsorship) =>
              update({ workAuthorization: { ...profile.workAuthorization, requiresSponsorship } })
            }
          />
          <AnswerSelect
            label="Gender"
            value={profile.eeo.gender}
            options={EEO_OPTIONS.gender}
            onChange={(gender) => update({ eeo: { ...profile.eeo, gender } })}
          />
          <AnswerSelect
            label="Race or ethnicity"
            value={profile.eeo.ethnicity}
            options={EEO_OPTIONS.ethnicity}
            onChange={(ethnicity) => update({ eeo: { ...profile.eeo, ethnicity } })}
          />
          <AnswerSelect
            label="Veteran status"
            value={profile.eeo.veteranStatus}
            options={EEO_OPTIONS.veteranStatus}
            onChange={(veteranStatus) => update({ eeo: { ...profile.eeo, veteranStatus } })}
          />
          <AnswerSelect
            label="Disability status"
            value={profile.eeo.disabilityStatus}
            options={EEO_OPTIONS.disabilityStatus}
            onChange={(disabilityStatus) => update({ eeo: { ...profile.eeo, disabilityStatus } })}
          />
        </div>
      </Section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={hasErrors}>
          Save profile
        </Button>
        <span role="status" className="text-sm">
          {hasErrors ? 'Fix the highlighted fields to save.' : saveStatus}
        </span>
      </div>
    </form>
  );
}
