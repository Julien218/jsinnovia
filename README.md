# PilotyaSign Pro

**by JS-Innov.IA**

> Le parcours commercial automatisé, du premier contact au paiement.

PilotyaSign Pro est une application multi-client conçue pour centraliser et automatiser un parcours commercial complet :

Prospects → Devis → Validation → Contrats → Signature → Paiements → Relances → Commissions → Statistiques.

## Positionnement

PilotyaSign Pro est un produit JS-Innov.IA indépendant. Un client comme Pixelium peut utiliser le service dans son propre espace sans devenir propriétaire du moteur ou de la plateforme.

## Rôles

- **Super Admin JS-Innov.IA** : supervision globale de la plateforme.
- **Owner / Admin client** : administration de son organisation et de ses paramètres commerciaux.
- **Commercial** : accès opérationnel limité au périmètre commercial.
- **Viewer** : lecture seule à terme.

## Architecture V1

- Front-end statique responsive servi par Nginx.
- Authentification et données via Supabase.
- Isolation multi-tenant via Row Level Security (RLS).
- Déploiement Railway dédié.
- Données : organisations, membres, offres, prospects, devis, contrats, paiements, commissions et journal d'activité.

## Déploiement

Branche de production dédiée : `pilotyasign-pro`.

Service Railway : `pilotyasign-pro-production`.

Domaine Railway : `pilotyasign-pro-production-production.up.railway.app`.

Domaine personnalisé prévu : `pilotyasign.jsinnovia.com`.

## État V1

Fonctionnel : authentification, création d'espace, prospects, pipeline, devis, contrats, suivi de signature, paiements manuels, commissions, statistiques et paramètres.

À connecter pour automatisation totale : moteur d'envoi e-mail, génération PDF/contrat, signature électronique et prestataire de paiement.
