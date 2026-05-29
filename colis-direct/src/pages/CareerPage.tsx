import { useState, useEffect } from 'react';
import { MapPin, Clock, Briefcase, Mail, ExternalLink, Search, X, Upload, CheckCircle } from 'lucide-react';
import Footer from '../components/Footer';
import Chatbot from '../components/Chatbot';
import PhoneInput from '../components/PhoneInput';
import { api } from '../lib/api';

interface CareerPageProps {
  onNavigate: (page: string) => void;
}

interface JobPosting {
  id: string;
  title: string;
  department?: string;
  location?: string;
  employment_type?: string;
  description: string;
  requirements?: string;
  benefits?: string;
  salary_range?: string;
  application_email?: string;
  application_url?: string;
  is_featured: boolean;
  posted_at: string;
  expires_at?: string;
}

function CareerPage({ onNavigate }: CareerPageProps) {
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState<string>('');

  useEffect(() => {
    loadJobPostings();
  }, [departmentFilter, employmentTypeFilter]);

  const loadJobPostings = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (departmentFilter) filters.department = departmentFilter;
      if (employmentTypeFilter) filters.employment_type = employmentTypeFilter;
      
      const { data, error } = await api.getJobPostings(filters);
      if (error) {
        console.error('Error loading job postings:', error);
        return;
      }
      setJobPostings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading job postings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobPostings.filter(job => {
    const matchesSearch = !searchTerm || 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.department && job.department.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const featuredJobs = filteredJobs.filter(job => job.is_featured);
  const regularJobs = filteredJobs.filter(job => !job.is_featured);

  const departments = Array.from(new Set(jobPostings.map(job => job.department).filter(Boolean)));
  const employmentTypes = Array.from(new Set(jobPostings.map(job => job.employment_type).filter(Boolean)));

  const getEmploymentTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      'full-time': 'Temps plein',
      'part-time': 'Temps partiel',
      'contract': 'Contrat',
      'internship': 'Stage'
    };
    return labels[type || ''] || type || 'Non spécifié';
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Dark hero */}
      <section className="px-4 sm:px-6 lg:px-8 pt-6 pb-0">
        <div className="rounded-3xl px-8 sm:px-14 py-12 sm:py-16 text-white" style={{ background: '#0f0f0f' }}>
          <div className="max-w-2xl">
            <div className="text-sm font-bold text-[#FF6C00] uppercase tracking-widest mb-4">Carrières</div>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight mb-5">
              Rejoignez l'équipe <span style={{ color: '#FF6C00' }}>COLISDIRECT</span>
            </h1>
            <p className="text-base text-white/70 leading-relaxed max-w-xl">
              Faites partie d'une équipe dynamique qui révolutionne la logistique en Afrique.
            </p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-6 px-4 sm:px-6 lg:px-8 border-b border-[#E6E6E6] bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280] w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher un poste..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="input-field md:w-48"
            >
              <option value="">Tous les départements</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            <select
              value={employmentTypeFilter}
              onChange={(e) => setEmploymentTypeFilter(e.target.value)}
              className="input-field md:w-48"
            >
              <option value="">Tous les types</option>
              {employmentTypes.map(type => (
                <option key={type} value={type}>{getEmploymentTypeLabel(type)}</option>
              ))}
            </select>

            {(departmentFilter || employmentTypeFilter || searchTerm) && (
              <button
                onClick={() => { setDepartmentFilter(''); setEmploymentTypeFilter(''); setSearchTerm(''); }}
                className="flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#1A1A1A] font-medium"
              >
                <X className="w-4 h-4" />
                Réinitialiser
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Job Listings */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-[#F6F7F9]">
        <div className="max-w-5xl mx-auto">
            {showApplicationForm && selectedJob ? (
              /* Application Form View */
              <ApplicationForm
                job={selectedJob}
                onClose={() => setShowApplicationForm(false)}
                onSuccess={() => {
                  setShowApplicationForm(false);
                  setSelectedJob(null);
                }}
                getEmploymentTypeLabel={getEmploymentTypeLabel}
              />
            ) : selectedJob ? (
              /* Job Detail View */
              <div className="card p-7 lg:p-10">
                <button
                  onClick={() => setSelectedJob(null)}
                  className="mb-6 text-[#FF6C00] hover:text-[#E66100] flex items-center gap-2 font-semibold text-sm"
                >
                  <X className="w-5 h-5" />
                  Retour à la liste
                </button>

                <div className="mb-6">
                  <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1A1A1A] mb-4">{selectedJob.title}</h2>
                  <div className="flex flex-wrap gap-4 text-sm text-[#6B7280] mb-4">
                    {selectedJob.department && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        {selectedJob.department}
                      </span>
                    )}
                    {selectedJob.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {selectedJob.location}
                      </span>
                    )}
                    {selectedJob.employment_type && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {getEmploymentTypeLabel(selectedJob.employment_type)}
                      </span>
                    )}
                    {selectedJob.salary_range && (
                      <span className="font-semibold text-[#FF6C00]">
                        {selectedJob.salary_range}
                      </span>
                    )}
                  </div>
                </div>

                <div className="prose max-w-none space-y-6">
                  <div>
                    <h3 className="text-xl font-extrabold tracking-tight text-[#1A1A1A] mb-3">Description</h3>
                    <div className="text-[#3A3A3A] whitespace-pre-wrap leading-relaxed">{selectedJob.description}</div>
                  </div>

                  {selectedJob.requirements && (
                    <div>
                      <h3 className="text-xl font-extrabold tracking-tight text-[#1A1A1A] mb-3">Exigences</h3>
                      <div className="text-[#3A3A3A] whitespace-pre-wrap leading-relaxed">{selectedJob.requirements}</div>
                    </div>
                  )}

                  {selectedJob.benefits && (
                    <div>
                      <h3 className="text-xl font-extrabold tracking-tight text-[#1A1A1A] mb-3">Avantages</h3>
                      <div className="text-[#3A3A3A] whitespace-pre-wrap leading-relaxed">{selectedJob.benefits}</div>
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-6 border-t border-[#E6E6E6]">
                  <button
                    onClick={() => setShowApplicationForm(true)}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <Mail className="w-5 h-5" />
                    Postuler maintenant
                  </button>
                </div>
              </div>
            ) : (
              /* Job List View */
              <>
                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6C00]" />
                    <p className="mt-4 text-[#6B7280]">Chargement des offres...</p>
                  </div>
                ) : filteredJobs.length === 0 ? (
                  <div className="text-center py-12">
                    <Briefcase className="w-16 h-16 text-[#E6E6E6] mx-auto mb-4" />
                    <h3 className="text-xl font-extrabold text-[#1A1A1A] mb-2">Aucune offre disponible</h3>
                    <p className="text-[#6B7280]">Il n'y a actuellement aucune offre correspondant à vos critères.</p>
                  </div>
                ) : (
                  <>
                    {/* Featured Jobs */}
                    {featuredJobs.length > 0 && (
                      <div className="mb-12">
                        <h2 className="text-2xl font-extrabold text-[#1A1A1A] mb-6 flex items-center gap-2 tracking-tight">
                          <span className="bg-[#FF6C00] text-white px-3 py-1 rounded-full text-sm">Vedette</span>
                          Offres en vedette
                        </h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {featuredJobs.map(job => (
                            <JobCard
                              key={job.id}
                              job={job}
                              onClick={() => {
                                setSelectedJob(job);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              getEmploymentTypeLabel={getEmploymentTypeLabel}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Regular Jobs */}
                    {regularJobs.length > 0 && (
                      <div>
                        {featuredJobs.length > 0 && (
                          <h2 className="text-2xl font-extrabold text-[#1A1A1A] mb-6 tracking-tight">Toutes les offres</h2>
                        )}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {regularJobs.map(job => (
                            <JobCard
                              key={job.id}
                              job={job}
                              onClick={() => {
                                setSelectedJob(job);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              getEmploymentTypeLabel={getEmploymentTypeLabel}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
        </div>
      </section>

      <Footer onNavigate={onNavigate} />
      <Chatbot />
    </div>
  );
}

interface JobCardProps {
  job: JobPosting;
  onClick: () => void;
  getEmploymentTypeLabel: (type?: string) => string;
}

function JobCard({ job, onClick, getEmploymentTypeLabel }: JobCardProps) {
  return (
    <div
      onClick={onClick}
      className={`card p-6 cursor-pointer border-2 transition-all hover:shadow-lg ${
        job.is_featured ? 'border-[#FF6C00]' : 'border-[#E6E6E6] hover:border-[#FF6C00]/40'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-extrabold text-[#1A1A1A] mb-2 tracking-tight">{job.title}</h3>
          <div className="flex flex-wrap gap-3 text-sm text-[#6B7280]">
            {job.department && (
              <span className="flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                {job.department}
              </span>
            )}
            {job.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {job.location}
              </span>
            )}
            {job.employment_type && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {getEmploymentTypeLabel(job.employment_type)}
              </span>
            )}
          </div>
        </div>
        {job.is_featured && (
          <span className="bg-[#FFF3E8] text-[#FF6C00] px-3 py-1 rounded-full text-xs font-bold flex-shrink-0">
            Vedette
          </span>
        )}
      </div>
      <p className="text-sm text-[#3A3A3A] line-clamp-3 mb-4 leading-relaxed">
        {job.description}
      </p>
      {job.salary_range && (
        <p className="text-sm font-bold text-[#FF6C00] mb-4">{job.salary_range}</p>
      )}
      <button className="text-[#FF6C00] font-semibold text-sm hover:underline flex items-center gap-1.5">
        Voir les détails
        <ExternalLink className="w-4 h-4" />
      </button>
    </div>
  );
}


interface ApplicationFormProps {
  job: JobPosting;
  onClose: () => void;
  onSuccess: () => void;
  getEmploymentTypeLabel: (type?: string) => string;
}

function ApplicationForm({ job, onClose, onSuccess }: ApplicationFormProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    cover_letter: '',
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const maxSize = 5 * 1024 * 1024; // 5MB
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      
      if (file.size > maxSize) {
        setError('Le fichier est trop volumineux. Taille maximale : 5MB');
        return;
      }
      
      if (!allowedTypes.includes(file.type)) {
        setError('Format de fichier non supporté. Formats acceptés : PDF, DOC, DOCX');
        return;
      }
      
      setCvFile(file);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (!formData.first_name || !formData.last_name || !formData.email) {
        setError('Veuillez remplir tous les champs obligatoires');
        setSubmitting(false);
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append('job_posting_id', job.id);
      formDataToSend.append('first_name', formData.first_name);
      formDataToSend.append('last_name', formData.last_name);
      formDataToSend.append('email', formData.email);
      if (formData.phone) formDataToSend.append('phone', formData.phone);
      if (formData.cover_letter) formDataToSend.append('cover_letter', formData.cover_letter);
      if (cvFile) formDataToSend.append('cv', cvFile);

      const { error: submitError } = await api.submitJobApplication(formDataToSend);

      if (submitError) {
        setError(submitError);
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err) {
      setError('Une erreur est survenue lors de la soumission');
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="card p-10 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-2xl font-extrabold text-[#1A1A1A] mb-2">Candidature envoyée !</h3>
        <p className="text-[#6B7280] mb-6">
          Votre candidature pour le poste de <strong>{job.title}</strong> a été soumise avec succès.
        </p>
        <p className="text-sm text-[#6B7280]">Nous vous contacterons bientôt.</p>
      </div>
    );
  }

  return (
    <div className="card p-7 lg:p-10">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-[#1A1A1A] tracking-tight">Postuler pour : {job.title}</h2>
          <p className="text-sm text-[#6B7280] mt-1">Remplissez le formulaire ci-dessous</p>
        </div>
        <button onClick={onClose} className="text-[#6B7280] hover:text-[#1A1A1A]">
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#3A3A3A] mb-1.5">
              Prénom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#3A3A3A] mb-1.5">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="input-field"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#3A3A3A] mb-1.5">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <PhoneInput
              value={formData.phone}
              onChange={(v) => setFormData({ ...formData, phone: v })}
              label={<span className="block text-xs font-semibold text-[#3A3A3A] mb-1.5">Téléphone</span>}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#3A3A3A] mb-1.5">
            Lettre de motivation
          </label>
          <textarea
            value={formData.cover_letter}
            onChange={(e) => setFormData({ ...formData, cover_letter: e.target.value })}
            rows={5}
            className="input-field resize-none"
            placeholder="Décrivez pourquoi vous êtes intéressé par ce poste..."
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#3A3A3A] mb-1.5">
            CV <span className="text-red-500">*</span>
          </label>
          <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-[#E6E6E6] border-dashed rounded-xl hover:border-[#FF6C00] transition-colors">
            <div className="space-y-2 text-center">
              <Upload className="mx-auto h-10 w-10 text-[#E6E6E6]" />
              <div className="flex text-sm text-[#6B7280]">
                <label className="cursor-pointer font-semibold text-[#FF6C00] hover:text-[#E66100]">
                  <span>Télécharger un fichier</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="sr-only"
                    required
                  />
                </label>
                <p className="pl-1">ou glissez-déposez</p>
              </div>
              <p className="text-xs text-[#6B7280]">PDF, DOC, DOCX jusqu'à 5MB</p>
              {cvFile && (
                <p className="text-sm text-green-600 font-semibold">✓ {cvFile.name}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-outline flex-1"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                Soumettre
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CareerPage;

