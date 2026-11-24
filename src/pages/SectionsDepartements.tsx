import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

type Section = {
  id: string;
  code: string;
  intitule: string;
  type: 'section' | 'departement';
  actif: boolean;
};

const vide = {
  code: '',
  intitule: '',
  type: 'section' as 'section' | 'departement',
};

export default function SectionsDepartements() {
  const { aRole } = useAuth();

  const autorise = aRole('admin_central') || aRole('dg');

  const [sections, setSections] = useState<Section[]>([]);
  const [formulaire, setFormulaire] = useState(vide);
  const [edition, setEdition] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [recherche, setRecherche] = useState('');

  async function chargerSections() {
    setChargement(true);
    setErreur('');

    const { data, error } = await supabase
      .from('sections')
      .select('id, code, intitule, type, actif')
      .order('intitule', { ascending: true });

    if (error) {
      setErreur('Impossible de charger les sections : ' + error.message);
    } else {
      setSections((data ?? []) as Section[]);
    }

    setChargement(false);
  }

  useEffect(() => {
    void chargerSections();
  }, []);

  function modifier(section: Section) {
    setEdition(section.id);
    setFormulaire({
      code: section.code,
      intitule: section.intitule,
      type: section.type,
    });
    setMessage('');
    setErreur('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function annuler() {
    setEdition(null);
    setFormulaire(vide);
    setErreur('');
    setMessage('');
  }

  async function enregistrer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!autorise) return;

    setEnregistrement(true);
    setErreur('');
    setMessage('');

    const donnees = {
      code: formulaire.code.trim().toUpperCase(),
      intitule: formulaire.intitule.trim(),
      type: formulaire.type,
    };

    if (!donnees.code || !donnees.intitule) {
      setErreur('Veuillez remplir le code et l’intitulé.');
      setEnregistrement(false);
      return;
    }

    const resultat = edition
      ? await supabase
          .from('sections')
          .update(donnees)
          .eq('id', edition)
      : await supabase
          .from('sections')
          .insert({ ...donnees, actif: true });

    if (resultat.error) {
      setErreur('Enregistrement impossible : ' + resultat.error.message);
    } else {
      setMessage(
        edition
          ? 'Modification enregistrée avec succès.'
          : 'Nouvelle section enregistrée avec succès.'
      );

      setFormulaire(vide);
      setEdition(null);

      await chargerSections();
    }

    setEnregistrement(false);
  }

  async function changerStatut(section: Section) {
    if (!autorise) return;

    const confirmation = window.confirm(
      section.actif
        ? `Désactiver « ${section.intitule} » ?`
        : `Réactiver « ${section.intitule} » ?`
    );

    if (!confirmation) return;

    const { error } = await supabase
      .from('sections')
      .update({ actif: !section.actif })
      .eq('id', section.id);

    if (error) {
      setErreur('Changement de statut impossible : ' + error.message);
    } else {
      setMessage('Statut modifié avec succès.');
      await chargerSections();
    }
  }

  const liste = sections.filter((s) => {
    const terme = recherche.toLowerCase();
    return (
      s.code.toLowerCase().includes(terme) ||
      s.intitule.toLowerCase().includes(terme)
    );
  });

  if (!autorise) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-xl font-bold text-red-700">
          Accès non autorisé
        </h1>
        <p className="mt-2 text-sm text-red-600">
          Seuls l'administrateur central et le Directeur général
          peuvent gérer les sections et les départements.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-slate-500">
          Espace académique / ACA-04
        </p>
        <h1 className="mt-1 text-2xl font-bold text-navy-700">
          Sections et départements
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Création et gestion de la structure académique de l'ISTM-Tshikapa.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-navy-700">
          {edition ? 'Modifier une structure' : 'Créer une section ou un département'}
        </h2>

        <form onSubmit={enregistrer} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Code
              </label>
              <input
                required
                value={formulaire.code}
                onChange={(e) =>
                  setFormulaire({ ...formulaire, code: e.target.value })
                }
                placeholder="Exemple : SI"
                className="w-full rounded-lg border border-slate-300 p-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Type
              </label>
              <select
                value={formulaire.type}
                onChange={(e) =>
                  setFormulaire({
                    ...formulaire,
                    type: e.target.value as 'section' | 'departement',
                  })
                }
                className="w-full rounded-lg border border-slate-300 bg-white p-3"
              >
                <option value="section">Section</option>
                <option value="departement">Département</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Intitulé
            </label>
            <input
              required
              value={formulaire.intitule}
              onChange={(e) =>
                setFormulaire({ ...formulaire, intitule: e.target.value })
              }
              placeholder="Exemple : Sciences infirmières"
              className="w-full rounded-lg border border-slate-300 p-3"
            />
          </div>

          {erreur && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {erreur}
            </p>
          )}

          {message && (
            <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
              {message}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={enregistrement}
              className="rounded-lg bg-green-700 px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              {enregistrement
                ? 'Enregistrement...'
                : edition
                  ? 'Enregistrer les modifications'
                  : '+ Créer'}
            </button>

            {edition && (
              <button
                type="button"
                onClick={annuler}
                className="rounded-lg border border-slate-300 px-5 py-3"
              >
                Annuler
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-navy-700">
            Structures enregistrées ({sections.length})
          </h2>

          <button
            type="button"
            onClick={() => void chargerSections()}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
          >
            Actualiser
          </button>
        </div>

        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher par code ou intitulé..."
          className="mb-4 w-full rounded-lg border border-slate-300 p-3"
        />

        {chargement ? (
          <p className="py-5 text-center text-slate-500">
            Chargement des structures...
          </p>
        ) : liste.length === 0 ? (
          <p className="py-5 text-center text-slate-500">
            Aucune structure trouvée.
          </p>
        ) : (
          <div className="space-y-3">
            {liste.map((section) => (
              <div
                key={section.id}
                className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="font-bold text-navy-700">
                    {section.intitule}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Code : {section.code} ·{' '}
                    {section.type === 'section' ? 'Section' : 'Département'}
                  </p>
                  <span
                    className={`mt-2 inline-block rounded-full px-3 py-1 text-xs ${
                      section.actif
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {section.actif ? 'Actif' : 'Inactif'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => modifier(section)}
                    className="rounded-lg border border-blue-300 px-3 py-2 text-sm text-blue-700"
                  >
                    Modifier
                  </button>

                  <button
                    type="button"
                    onClick={() => void changerStatut(section)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {section.actif ? 'Désactiver' : 'Réactiver'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
    }
