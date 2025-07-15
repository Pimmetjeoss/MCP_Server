import { z } from 'zod';

// Herbruikbare schema voor datum velden die zowel string als Date accepteert
const dateOrString = z.union([z.string(), z.date()])
  .transform(val => val instanceof Date ? val.toISOString() : val);

// Definieer het Zod schema voor het database rapport
export const DatabaseReportSchema = z.object({
  algemeneStatistieken: z.object({
    totaalAantalRecords: z.number().int().min(0),
    totaalAantalTabellen: z.number().int().min(0),
    databaseGrootte: z.string(),
    periodeVanData: z.string()
  }),
  
  tabelOverzicht: z.array(z.object({
    tabelNaam: z.string(),
    aantalRecords: z.number().int().min(0),
    primaireSleutel: z.string()
  })),
  
  dataKwaliteit: z.object({
    volledigheid: z.object({
      percentageCompleteRecords: z.number().min(0).max(100),
      legeVelden: z.array(z.object({
        tabel: z.string(),
        kolom: z.string(),
        aantalNull: z.number().int().min(0)
      }))
    }),
    consistentie: z.object({
      duplicateRecords: z.number().int().min(0),
      formatInconsistenties: z.array(z.string())
    })
  }),
  
  emailDomeinAnalyse: z.array(z.object({
    domein: z.string(),
    aantal: z.number().int().min(0),
    percentage: z.number().min(0).max(100)
  })),
  
  temporelePatronen: z.object({
    meestActievePeriode: dateOrString, // Aangepast om Date objecten te accepteren
    gemiddeldeRecordsPerDag: z.number().min(0),
    trend: z.enum(['stijgend', 'dalend', 'stabiel'])
  }),
  
  aanbevelingen: z.array(z.string()).length(3),
  
  conclusie: z.string()
});

// Genereer TypeScript type uit Zod schema
export type DatabaseReport = z.infer<typeof DatabaseReportSchema>;
