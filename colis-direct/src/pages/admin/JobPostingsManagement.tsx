import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Star, StarOff, X, Save } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'react-toastify';

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
  is_active: boolean;
  is_featured: boolean;
  posted_at: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  created_by_email?: string;
  created_by_name?: string;
}

function JobPostingsManagement() {
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<JobPosting>>({
    title: '',
    department: '',
    location: '',
    employment_type: '',
    description: '',
    requirements: '',
    benefits: '',
    salary_range: '',
    application_email: '',
    application_url: '',
    is_active: true,
    is_featured: false,
    expires_at: '',
  });

  useEffect(() => {
    loadJobPostings();
  }, []);

  const loadJobPostings = async () => {
    try {
      setLoading(true);
      const { data, error } = await api.getAllJobPostings();
      if (error) {
        toast.error('Erreur lors du chargement des offres');
        return;
      }
      setJobPostings(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Erreur lors du chargement des offres');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingJob(null);
    setFormData({
      title: '',
      department: '',
      location: '',
      employment_type: '',
      description: '',
      requirements: '',
      benefits: '',
      salary_range: '',
      application_email: '',
      application_url: '',
      is_active: true,
      is_featured: false,
      expires_at: '',
    });
    setShowForm(true);
  };

  const handleEdit = (job: JobPosting) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      department: job.department || '',
      location: job.location || '',
      employment_type: job.employment_type || '',
      description: job.description,
      requirements: job.requirements || '',
      benefits: job.benefits || '',
      salary_range: job.salary_range || '',
      application_email: job.application_email || '',
      application_url: job.application_url || '',
      is_active: job.is_active,
      is_featured: job.is_featured,
      expires_at: job.expires_at ? job.expires_at.split('T')[0] : '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.title || !formData.description) {
        toast.error('Le titre et la description sont requis');
        return;
      }

      const payload = {
        ...formData,
        expires_at: formData.expires_at ? `${formData.expires_at}T23:59:59Z` : null,
      };

      if (editingJob) {
        const { error } = await api.updateJobPosting(editingJob.id, payload);
        if (error) {
          toast.error('Erreur lors de la mise à jour');
          return;
        }
        toast.success('Offre mise à jour avec succès');
      } else {
        const { error } = await api.createJobPosting(payload);
        if (error) {
          toast.error('Erreur lors de la création');
          return;
        }
        toast.success('Offre créée avec succès');
      }

      setShowForm(false);
      setEditingJob(null);
      loadJobPostings();
    } catch (error) {
      toast.error('Une erreur est survenue');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette offre ?')) {
      return;
    }

    try {
      const { error } = await api.deleteJobPosting(id);
      if (error) {
        toast.error('Erreur lors de la suppression');
        return;
      }
      toast.success('Offre supprimée avec succès');
      loadJobPostings();
    } catch (error) {
      toast.error('Une erreur est survenue');
    }
  };

  const toggleActive = async (job: JobPosting) => {
    try {
      const { error } = await api.updateJobPosting(job.id, {
        is_active: !job.is_active,
      });
      if (error) {
        toast.error('Erreur lors de la mise à jour');
        return;
      }
      toast.success(`Offre ${!job.is_active ? 'activée' : 'désactivée'}`);
      loadJobPostings();
    } catch (error) {
      toast.error('Une erreur est survenue');
    }
  };

  const toggleFeatured = async (job: JobPosting) => {
    try {
      const { error } = await api.updateJobPosting(job.id, {
        is_featured: !job.is_featured,
      });
      if (error) {
        toast.error('Erreur lors de la mise à jour');
        return;
      }
      toast.success(`Offre ${!job.is_featured ? 'mise en vedette' : 'retirée de la vedette'}`);
      loadJobPostings();
    } catch (error) {
      toast.error('Une erreur est survenue');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6C00]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Gestion des offres d'emploi</h2>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#e66100] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nouvelle offre
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">
              {editingJob ? 'Modifier l\'offre' : 'Nouvelle offre'}
            </h3>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingJob(null);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titre * <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Département</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Localisation</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type d'emploi</label>
              <select
                value={formData.employment_type}
                onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              >
                <option value="">Sélectionner...</option>
                <option value="full-time">Temps plein</option>
                <option value="part-time">Temps partiel</option>
                <option value="contract">Contrat</option>
                <option value="internship">Stage</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salaire</label>
              <input
                type="text"
                value={formData.salary_range}
                onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
                placeholder="Ex: 500 000 - 800 000 FCFA"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date d'expiration</label>
              <input
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description * <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Exigences</label>
              <textarea
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Avantages</label>
              <textarea
                value={formData.benefits}
                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email de candidature</label>
              <input
                type="email"
                value={formData.application_email}
                onChange={(e) => setFormData({ ...formData, application_email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL de candidature</label>
              <input
                type="url"
                value={formData.application_url}
                onChange={(e) => setFormData({ ...formData, application_url: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2 flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-[#FF6C00] border-gray-300 rounded focus:ring-[#FF6C00]"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="w-4 h-4 text-[#FF6C00] border-gray-300 rounded focus:ring-[#FF6C00]"
                />
                <span className="text-sm text-gray-700">Mise en vedette</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => {
                setShowForm(false);
                setEditingJob(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#e66100] flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {editingJob ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Titre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Département
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobPostings.map((job) => (
                <tr key={job.id} className={!job.is_active ? 'opacity-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{job.title}</span>
                      {job.is_featured && (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {job.department || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {job.employment_type || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        job.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {job.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(job.posted_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleActive(job)}
                        className="text-gray-600 hover:text-gray-900"
                        title={job.is_active ? 'Désactiver' : 'Activer'}
                      >
                        {job.is_active ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => toggleFeatured(job)}
                        className="text-gray-600 hover:text-yellow-600"
                        title={job.is_featured ? 'Retirer de la vedette' : 'Mettre en vedette'}
                      >
                        {job.is_featured ? (
                          <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                        ) : (
                          <StarOff className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(job)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(job.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default JobPostingsManagement;

