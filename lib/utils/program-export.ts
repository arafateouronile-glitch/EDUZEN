import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, BorderStyle, WidthType } from "docx";

// Helper pour télécharger un blob
const saveBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

export const generateProgramHTML = (program: any) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  return `
    <div id="program-pdf-content" style="font-family: Arial, sans-serif; color: #333; padding: 40px; max-width: 800px; margin: 0 auto; background: white;">
      <div style="text-align: center; margin-bottom: 40px; border-bottom: 2px solid #335ACF; padding-bottom: 20px;">
        <h1 style="color: #335ACF; font-size: 28px; margin-bottom: 10px; text-transform: uppercase;">${program.name}</h1>
        ${program.subtitle ? `<h2 style="font-size: 18px; color: #666; margin-top: 0;">${program.subtitle}</h2>` : ''}
        <div style="display: flex; justify-content: center; gap: 20px; margin-top: 15px; font-size: 14px; color: #555;">
          <span><strong>Code:</strong> ${program.code}</span>
          ${program.category ? `<span><strong>Catégorie:</strong> ${program.category}</span>` : ''}
          <span><strong>Version:</strong> ${program.program_version || '1'} (${formatDate(program.version_date)})</span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f9fafb; padding: 20px; border-radius: 8px;">
        <div>
          <p style="margin: 5px 0;"><strong>Durée:</strong> ${program.duration_hours ? `${program.duration_hours} heures` : ''} ${program.duration_days ? `(${program.duration_days} jours)` : ''}</p>
          <p style="margin: 5px 0;"><strong>Prix (Standard):</strong> ${program.price ? `${program.price} ${program.currency || 'XOF'}` : 'Non défini'}</p>
        </div>
        <div>
           <p style="margin: 5px 0;"><strong>Éligible CPF:</strong> ${program.eligible_cpf ? `Oui (${program.cpf_code || 'N/A'})` : 'Non'}</p>
           <p style="margin: 5px 0;"><strong>Certifiant:</strong> ${program.certification_issued ? 'Oui' : 'Non'}</p>
        </div>
      </div>

      ${program.description ? `
        <div style="margin-bottom: 25px;">
          <h3 style="color: #335ACF; border-bottom: 1px solid #eee; padding-bottom: 8px;">Description</h3>
          <p style="line-height: 1.6; white-space: pre-wrap;">${program.description}</p>
        </div>
      ` : ''}

      ${program.pedagogical_objectives ? `
        <div style="margin-bottom: 25px;">
          <h3 style="color: #335ACF; border-bottom: 1px solid #eee; padding-bottom: 8px;">Objectifs Pédagogiques</h3>
          <p style="line-height: 1.6; white-space: pre-wrap;">${program.pedagogical_objectives}</p>
        </div>
      ` : ''}

      ${program.learner_profile ? `
        <div style="margin-bottom: 25px;">
          <h3 style="color: #335ACF; border-bottom: 1px solid #eee; padding-bottom: 8px;">Profil des Apprenants & Prérequis</h3>
          <p style="line-height: 1.6; white-space: pre-wrap;">${program.learner_profile}</p>
          ${program.prerequisites ? `<p style="margin-top: 10px;"><strong>Prérequis:</strong> ${program.prerequisites}</p>` : ''}
        </div>
      ` : ''}

      ${program.training_content ? `
        <div style="margin-bottom: 25px;">
          <h3 style="color: #335ACF; border-bottom: 1px solid #eee; padding-bottom: 8px;">Contenu de la Formation</h3>
          <div style="line-height: 1.6; white-space: pre-wrap; background: #f0f7ff; padding: 15px; border-radius: 6px;">${program.training_content}</div>
        </div>
      ` : ''}

      ${program.modalities ? `
        <div style="margin-bottom: 25px;">
          <h3 style="color: #335ACF; border-bottom: 1px solid #eee; padding-bottom: 8px;">Modalités Pédagogiques</h3>
          <p style="line-height: 1.6; white-space: pre-wrap;">${program.modalities}</p>
        </div>
      ` : ''}

      ${program.certification_modalities ? `
        <div style="margin-bottom: 25px;">
          <h3 style="color: #335ACF; border-bottom: 1px solid #eee; padding-bottom: 8px;">Modalités de Certification</h3>
          <p style="line-height: 1.6; white-space: pre-wrap;">${program.certification_modalities}</p>
        </div>
      ` : ''}

      <div style="margin-top: 50px; font-size: 12px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
        Généré par EDUZEN le ${new Date().toLocaleDateString('fr-FR')}
      </div>
    </div>
  `;
};

export const generateProgramDOCX = async (program: any) => {
  const sections = [];

  // Header
  sections.push(
    new Paragraph({
      text: program.name.toUpperCase(),
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  if (program.subtitle) {
    sections.push(
      new Paragraph({
        text: program.subtitle,
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );
  }

  // Meta info
  sections.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Code: ", bold: true }),
        new TextRun({ text: program.code + "\t\t" }),
        new TextRun({ text: "Version: ", bold: true }),
        new TextRun({ text: `${program.program_version || '1'} (${new Date(program.version_date || Date.now()).toLocaleDateString('fr-FR')})` }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Helper for sections
  const createSection = (title: string, content?: string) => {
    if (!content) return [];
    return [
      new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
        border: {
          bottom: {
            color: "335ACF",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
      }),
      new Paragraph({
        text: content,
        spacing: { after: 200 },
      }),
    ];
  };

  // Add sections
  if (program.description) sections.push(...createSection("Description", program.description));
  
  // Info Grid (Duration, Price) as text for simplicity in DOCX
  sections.push(
    new Paragraph({
      text: "Informations Clés",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
      border: { bottom: { color: "335ACF", space: 1, style: BorderStyle.SINGLE, size: 6 } },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Durée: ", bold: true }),
        new TextRun({ text: `${program.duration_hours || '-'}h / ${program.duration_days || '-'}j` }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Prix: ", bold: true }),
        new TextRun({ text: `${program.price || '-'} ${program.currency || 'XOF'}` }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Eligible CPF: ", bold: true }),
        new TextRun({ text: program.eligible_cpf ? `Oui (${program.cpf_code || ''})` : "Non" }),
      ],
    })
  );

  if (program.pedagogical_objectives) sections.push(...createSection("Objectifs Pédagogiques", program.pedagogical_objectives));
  if (program.learner_profile) sections.push(...createSection("Profil des Apprenants", program.learner_profile));
  if (program.prerequisites) sections.push(...createSection("Prérequis", program.prerequisites));
  if (program.training_content) sections.push(...createSection("Contenu de la Formation", program.training_content));
  if (program.modalities) sections.push(...createSection("Modalités Pédagogiques", program.modalities));
  if (program.execution_follow_up) sections.push(...createSection("Suivi de l'exécution", program.execution_follow_up));
  if (program.certification_modalities) sections.push(...createSection("Modalités de Certification", program.certification_modalities));

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: sections,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveBlob(blob, `Programme_${program.code}.docx`);
};





