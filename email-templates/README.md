# Modèles e-mail JS-Innov.IA

`master.html` est la structure commune aux applications JS-Innov.IA.

Variables de personnalisation :

- `%%PRODUCT_NAME%%` : nom de l'application
- `%%PRODUCT_ACCENT%%` : couleur principale hexadécimale
- `%%TITLE%%` : titre du message
- `%%MESSAGE%%` : texte principal
- `%%ACTION_URL%%` : lien sécurisé
- `%%ACTION_LABEL%%` : libellé du bouton
- `%%SECURITY_NOTE%%` : avertissement de sécurité
- `%%SUPPORT_EMAIL%%` : adresse d'assistance

Pour Supabase, remplacer `%%ACTION_URL%%` par `{{ .ConfirmationURL }}`. Les styles sont intégrés et la structure utilise des tableaux pour rester compatible avec Gmail, Outlook et les appareils mobiles.

Le logo officiel à utiliser est `assets/jsinnovia-logo-official.png`, issu du dépôt de référence `Julien218/jsinnovia-assets-` (`logo-complet-800.png`). Ne jamais redessiner ou générer approximativement le logo.
