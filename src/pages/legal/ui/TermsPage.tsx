import { t } from '@/shared/i18n'
import { LegalDoc } from './LegalDoc'

export const Terms = () => <LegalDoc title={t.legal.termsTitle} lead={t.legal.termsLead} parts={t.legal.terms} />
