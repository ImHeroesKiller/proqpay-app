export type ImportTemplateDef = {
  code: string;
  name: string;
  description: string;
  version: string;
  columns: { key: string; label: string; required: boolean; example?: string }[];
};

export const IMPORT_TEMPLATES: ImportTemplateDef[] = [
  {
    code: "EMPLOYEE_MASTER",
    name: "Employee Master",
    description: "Master data karyawan untuk onboarding massal",
    version: "1.0",
    columns: [
      { key: "employee_code", label: "Kode Karyawan", required: true, example: "EMP-001" },
      { key: "name", label: "Nama", required: true, example: "Budi Santoso" },
      { key: "email", label: "Email", required: true, example: "budi@contoh.com" },
      { key: "phone", label: "Telepon", required: false, example: "08123456789" },
      { key: "department", label: "Departemen", required: true, example: "Operations" },
      { key: "position", label: "Jabatan", required: true, example: "SPG" },
      { key: "join_date", label: "Tanggal Masuk", required: true, example: "2026-01-15" },
      { key: "base_salary", label: "Gaji Pokok", required: true, example: "5000000" },
      { key: "bank_name", label: "Bank", required: true, example: "BCA" },
      { key: "bank_account", label: "No Rekening", required: true, example: "1234567890" },
      { key: "tax_status", label: "Status Pajak", required: true, example: "TK/0" },
      { key: "bpjs_number", label: "No BPJS", required: false, example: "000123" },
      { key: "npwp", label: "NPWP", required: false, example: "10.20.30.40-000.000" },
      { key: "client_code", label: "Kode Client", required: false },
      { key: "project_code", label: "Kode Project", required: false },
      { key: "payroll_group_code", label: "Kode Payroll Group", required: false },
    ],
  },
  {
    code: "EMPLOYEE_PERSONAL",
    name: "Employee Personal Profile",
    description: "Profil personal (NIK, alamat)",
    version: "1.0",
    columns: [
      { key: "employee_code", label: "Kode Karyawan", required: true, example: "EMP-001" },
      { key: "identity_number", label: "NIK", required: true, example: "3174xxxxxxxxxx" },
      { key: "birth_date", label: "Tanggal Lahir", required: false, example: "1995-05-01" },
      { key: "address", label: "Alamat", required: false, example: "Jakarta" },
    ],
  },
  {
    code: "EMPLOYEE_CONTRACT",
    name: "Employee Contract",
    description: "Kontrak kerja",
    version: "1.0",
    columns: [
      { key: "employee_code", label: "Kode Karyawan", required: true, example: "EMP-001" },
      { key: "contract_type", label: "Jenis Kontrak", required: true, example: "PKWT" },
      { key: "start_date", label: "Mulai", required: true, example: "2026-01-01" },
      { key: "end_date", label: "Selesai", required: false, example: "2026-12-31" },
    ],
  },
  {
    code: "PROJECT_ASSIGNMENT",
    name: "Project Assignment",
    description: "Penempatan ke project",
    version: "1.0",
    columns: [
      { key: "employee_code", label: "Kode Karyawan", required: true, example: "EMP-001" },
      { key: "project_code", label: "Kode Project", required: true, example: "PRJ-01" },
      { key: "start_date", label: "Mulai", required: true, example: "2026-02-01" },
      { key: "end_date", label: "Selesai", required: false },
      { key: "role_label", label: "Peran", required: false, example: "SPG" },
    ],
  },
  {
    code: "COMPENSATION",
    name: "Compensation",
    description: "Penyesuaian gaji",
    version: "1.0",
    columns: [
      { key: "employee_code", label: "Kode Karyawan", required: true, example: "EMP-001" },
      { key: "base_salary", label: "Gaji Pokok", required: true, example: "5500000" },
      { key: "effective_date", label: "Efektif", required: true, example: "2026-03-01" },
    ],
  },
  {
    code: "BANK_ACCOUNT",
    name: "Bank Account",
    description: "Rekening bank karyawan",
    version: "1.0",
    columns: [
      { key: "employee_code", label: "Kode Karyawan", required: true, example: "EMP-001" },
      { key: "bank_name", label: "Bank", required: true, example: "BCA" },
      { key: "bank_account", label: "No Rekening", required: true, example: "1234567890" },
    ],
  },
  {
    code: "TAX_PROFILE",
    name: "Tax Profile",
    description: "Profil PPh21",
    version: "1.0",
    columns: [
      { key: "employee_code", label: "Kode Karyawan", required: true, example: "EMP-001" },
      { key: "ptkp_status", label: "PTKP", required: true, example: "TK/0" },
      { key: "npwp", label: "NPWP", required: false },
      { key: "tax_method", label: "Metode Pajak", required: true, example: "GROSS" },
    ],
  },
  {
    code: "BPJS_ENROLLMENT",
    name: "BPJS Enrollment",
    description: "Kepesertaan BPJS",
    version: "1.0",
    columns: [
      { key: "employee_code", label: "Kode Karyawan", required: true, example: "EMP-001" },
      { key: "bpjs_kesehatan", label: "BPJS Kesehatan", required: false },
      { key: "bpjs_tk", label: "BPJS TK", required: false },
    ],
  },
  {
    code: "ATTENDANCE_SUMMARY",
    name: "Attendance Summary",
    description: "Ringkasan kehadiran periode",
    version: "1.0",
    columns: [
      { key: "employee_code", label: "Kode Karyawan", required: true, example: "EMP-001" },
      { key: "period_start", label: "Periode Mulai", required: true, example: "2026-07-01" },
      { key: "period_end", label: "Periode Selesai", required: true, example: "2026-07-31" },
      { key: "present_days", label: "Hari Hadir", required: true, example: "22" },
      { key: "absent_days", label: "Hari Alpha", required: false, example: "0" },
      { key: "overtime_hours", label: "Jam Lembur", required: false, example: "4" },
    ],
  },
  {
    code: "PAYROLL_VARIABLE",
    name: "Payroll Variable",
    description: "Komponen variable payroll",
    version: "1.0",
    columns: [
      { key: "employee_code", label: "Kode Karyawan", required: true, example: "EMP-001" },
      { key: "component_code", label: "Kode Komponen", required: true, example: "MEAL" },
      { key: "amount", label: "Nominal", required: true, example: "250000" },
    ],
  },
  {
    code: "EMPLOYEE_MUTATION",
    name: "Employee Mutation",
    description: "Mutasi project/departemen",
    version: "1.0",
    columns: [
      { key: "employee_code", label: "Kode Karyawan", required: true, example: "EMP-001" },
      { key: "to_project_code", label: "Project Tujuan", required: false },
      { key: "to_department", label: "Departemen Tujuan", required: false },
      { key: "effective_date", label: "Efektif", required: true, example: "2026-08-01" },
    ],
  },
  {
    code: "EMPLOYEE_TERMINATION",
    name: "Employee Termination",
    description: "Terminasi karyawan",
    version: "1.0",
    columns: [
      { key: "employee_code", label: "Kode Karyawan", required: true, example: "EMP-001" },
      { key: "terminate_date", label: "Tanggal Berhenti", required: true, example: "2026-07-31" },
      { key: "reason", label: "Alasan", required: false, example: "Kontrak berakhir" },
    ],
  },
];

export function getTemplate(code: string) {
  return IMPORT_TEMPLATES.find((t) => t.code === code);
}
