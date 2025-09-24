const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');
const readline = require('readline');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('Starting TimetableSessions CSV importer');

// Helpers
const INT31_MAX = 2147483647;
function toInt31(value: number) {
  if (!Number.isFinite(value)) return 0;
  let v = Math.trunc(value);
  // normalize into [0, INT31_MAX)
  v = ((v % INT31_MAX) + INT31_MAX) % INT31_MAX;
  // avoid zero, keep within 1..INT31_MAX
  if (v === 0) v = 1;
  return v;
}
function toNullIfEmpty(value: string) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length === 0 ? null : trimmed;
}

function parseIntOrNull(value: string) {
  const v = toNullIfEmpty(value);
  if (v === null) return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function normalizeDate(value: string) {
  const v = toNullIfEmpty(value);
  if (v === null) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeTime(value: string) {
  const v = toNullIfEmpty(value);
  if (v === null) return null;
  if (/^\d{2}:\d{2}$/.test(v)) return `${v}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(v)) return v;
  return null;
}

function simpleHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  // convert to positive 31-bit int range (MySQL INT signed)
  return toInt31(hash);
}

function buildCompositeKey(row: any) {
  return [
    row.module_tibl_code || '',
    row.start_date || '',
    row.start_time || '',
    row.activity_reference || ''
  ].join('|');
}

// Prompt for connection URL
rl.question('Enter MySQL connection URL (format: mysql://user:password@host:port/database): ', (connectionUrl) => {
  try {
    const urlPattern = /^mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/;
    const match = connectionUrl.match(urlPattern);
    if (!match) {
      console.error('Invalid connection URL format. Expected: mysql://user:password@host:port/database');
      rl.close();
      return;
    }

    const [, user, password, host, port, database] = match;

    const connection = mysql.createConnection({
      host: host,
      port: parseInt(port, 10),
      user: user,
      password: password,
      database: database,
      authPlugins: {
        mysql_clear_password: () => () => Buffer.from(password + '\0')
      },
      insecureAuth: true,
      multipleStatements: true
    });

    connection.connect(async (err: any) => {
      if (err) {
        console.error('Error connecting to database:', err);
        rl.close();
        return;
      }
      console.log('Connected to MySQL database');

      try {
        const dir = __dirname;
        const csvFiles = fs.readdirSync(dir).filter((f: string) => f.toLowerCase().endsWith('.csv'));
        if (csvFiles.length === 0) {
          console.log('No CSV files found in directory:', dir);
          connection.end();
          rl.close();
          return;
        }

        for (const csvFile of csvFiles) {
          const csvPath = path.join(dir, csvFile);
          console.log(`Processing: ${csvPath}`);

          const data = fs.readFileSync(csvPath, 'utf8');
          const rows = data.trim().split('\n');

          let descriptionCount = 0;
          const headerLine = rows.shift();
          if (!headerLine) {
            console.warn('Empty CSV, skipping:', csvFile);
            continue;
          }
          const columns = headerLine
            .trim()
            .split(';')
            .map((col) => {
              col = col.replace(/"/g, '');
              if (col === 'Description') {
                descriptionCount++;
                if (descriptionCount === 2) return 'Description2';
              }
              return col;
            });

          const filteredColumns = columns.filter((col: string) => col !== 'Attendance is mandatory for this activity');

          type SessionRow = {
            activityID: number,
            activity_reference: string | null,
            module_tibl_code: string | null,
            start_day: string | null,
            start_date: string | null,
            start_time: string | null,
            end_date: string | null,
            end_time: string | null,
            duration: string | null,
            type: string | null,
            staff: string | null,
            location: string | null,
            department: string | null,
            size: number | null,
            module_description: string | null,
            weekly_pattern: string | null,
            online_location: string | null,
            online_session_details: string | null,
            notes: string | null,
          };

          function valueFor(colName: string, rowValues: string[]) {
            const idx = columns.indexOf(colName);
            if (idx === -1) return '';
            const raw = rowValues[idx] || '';
            return raw.replace(/"/g, '');
          }

          const parsedRows: SessionRow[] = rows.map((line) => {
            const rowValues = line.trim().split(';');
            const activityRef = toNullIfEmpty(valueFor('Activity reference', rowValues));
            const moduleCode = toNullIfEmpty(valueFor('Module code', rowValues));
            const startDay = toNullIfEmpty(valueFor('Start day', rowValues));
            const sDate = normalizeDate(valueFor('Start date', rowValues));
            const sTime = normalizeTime(valueFor('Start time', rowValues));
            const eDate = normalizeDate(valueFor('End date', rowValues));
            const eTime = normalizeTime(valueFor('End time', rowValues));
            const duration = toNullIfEmpty(valueFor('Duration', rowValues));
            const type = toNullIfEmpty(valueFor('Type', rowValues));
            const staff = toNullIfEmpty(valueFor('Staff member(s)', rowValues));
            const location = toNullIfEmpty(valueFor('Location(s)', rowValues));
            const department = toNullIfEmpty(valueFor('Department', rowValues));
            const size = parseIntOrNull(valueFor('Size', rowValues));
            const module_description = toNullIfEmpty(valueFor('Module description', rowValues));
            const weekly_pattern = toNullIfEmpty(valueFor('Weekly pattern', rowValues));
            const online_location = toNullIfEmpty(valueFor('This activity takes place on location', rowValues));
            const online_session_details = toNullIfEmpty(valueFor('Online session details', rowValues));
            const rawActivityId = valueFor('activityID', rowValues);

            let activityID = parseIntOrNull(rawActivityId) ?? 0;
            if (!activityID || activityID <= 0) {
              const stable = [activityRef || '', moduleCode || '', sDate || '', sTime || '', eDate || '', eTime || ''].join('|');
              activityID = simpleHash(stable);
            }
            // Ensure activityID fits MySQL signed INT range (1..2147483647)
            activityID = toInt31(activityID);

            return {
              activityID,
              activity_reference: activityRef,
              module_tibl_code: moduleCode,
              start_day: startDay,
              start_date: sDate,
              start_time: sTime,
              end_date: eDate,
              end_time: eTime,
              duration,
              type,
              staff,
              location,
              department,
              size,
              module_description,
              weekly_pattern,
              online_location,
              online_session_details,
              notes: null,
            };
          }).filter((r: SessionRow) => r.module_tibl_code && r.start_date && r.start_time);

          if (parsedRows.length === 0) {
            console.log('No parsable rows in', csvFile);
            continue;
          }

          const moduleCodes = Array.from(new Set(parsedRows.map((r: SessionRow) => r.module_tibl_code))) as string[];
          const dates = parsedRows.map((r: SessionRow) => r.start_date as string);
          const minDate = dates.reduce((a, b) => (a < b ? a : b));
          const maxDate = dates.reduce((a, b) => (a > b ? a : b));

          const existingIdSet = new Set<number>();
          const existingCompositeSet = new Set<string>();

          if (moduleCodes.length > 0) {
            const [existingRows] = await connection.promise().query(
              `SELECT activityID, module_tibl_code, start_date, start_time, activity_reference
               FROM TimetableSessions
               WHERE module_tibl_code IN (${moduleCodes.map(() => '?').join(',')})
                 AND start_date BETWEEN ? AND ?`,
              [...moduleCodes, minDate, maxDate]
            );
            (existingRows as any[]).forEach((r: any) => {
              if (typeof r.activityID === 'number') existingIdSet.add(r.activityID);
              const startDate = typeof r.start_date === 'string' ? r.start_date : (r.start_date?.toISOString?.().slice(0,10) || '');
              const startTime = typeof r.start_time === 'string' ? r.start_time : (r.start_time?.toISOString?.().slice(11,19) || '');
              const key = [r.module_tibl_code || '', startDate, startTime, r.activity_reference || ''].join('|');
              existingCompositeSet.add(key);
            });
          }

          const toInsert = parsedRows.filter((r: SessionRow) => {
            if (existingIdSet.has(r.activityID)) return false;
            const key = buildCompositeKey(r);
            return !existingCompositeSet.has(key);
          });

          if (toInsert.length === 0) {
            console.log('All rows already exist for', csvFile);
            continue;
          }

          const insertColumns = [
            'activityID','activity_reference','module_tibl_code','start_day','start_date','start_time','end_date','end_time','duration','type','staff','location','department','size','module_description','weekly_pattern','online_location','online_session_details','notes'
          ];
          const placeholders = insertColumns.map(() => '?').join(',');

          const chunkSize = 1000;
          for (let i = 0; i < toInsert.length; i += chunkSize) {
            const chunk = toInsert.slice(i, i + chunkSize);
            const params: any[] = [];
            chunk.forEach((r: SessionRow) => {
              params.push(
                r.activityID,
                r.activity_reference,
                r.module_tibl_code,
                r.start_day,
                r.start_date,
                r.start_time,
                r.end_date,
                r.end_time,
                r.duration,
                r.type,
                r.staff,
                r.location,
                r.department,
                r.size,
                r.module_description,
                r.weekly_pattern,
                r.online_location,
                r.online_session_details,
                r.notes
              );
            });
            const valuesClause = new Array(chunk.length).fill(`(${placeholders})`).join(',');
            const fullSql = `INSERT INTO TimetableSessions (${insertColumns.join(',')}) VALUES ${valuesClause}`;
            await connection.promise().query(fullSql, params);
          }

          console.log(`Inserted ${toInsert.length} new rows from ${csvFile}`);
        }

        console.log('All CSV files processed.');
        connection.end();
        rl.close();
      } catch (procErr) {
        console.error('Processing error:', procErr);
        connection.end();
        rl.close();
      }
    });
  } catch (error) {
    console.error('Error parsing connection URL:', error);
    rl.close();
  }
});
