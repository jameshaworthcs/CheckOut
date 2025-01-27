var db=require('../../../databases/database');

// Function to get course details including modules, tibl, and other course-related data
async function courseDetails(inst, crs, yr) {
    // SQL query to fetch course details, including modules and the tibl flag
    const query = `
        SELECT M.module_code, M.module_name, M.module_tibl_code, I.name AS institution_name, 
               C.course_name, C.tibl
        FROM Courses C
        LEFT JOIN Modules M ON M.course_id = C.course_id
        INNER JOIN Institutions I ON C.institution_id = I.institution_id
        INNER JOIN Years Y ON M.year_id = Y.year_id
        WHERE C.institution_id = ? AND Y.year_number = ? AND C.course_code = ?
    `;
    
    try {
        // Execute the query asynchronously
        const results = await db.query(query, [inst, yr, crs]);

        // Check if any results are returned
        if (results.length === 0) {
            return { success: false, reason: 'Course not found or no modules attached.' };
        }

        // Structure the data to return
        const courseDetails = {
            success: true,
            institution_id: inst,
            institution_name: results[0].institution_name,
            year: parseInt(yr),
            course_code: crs,
            course_name: results[0].course_name,
            tibl: !!results[0].tibl,  // Convert the MySQL BOOLEAN to true/false
            modules: results.map(result => ({
                module_code: result.module_code,
                module_name: result.module_name,
                module_tibl_code: result.module_tibl_code  // Include the module_tibl_code
            }))
        };

        // If no modules are attached to the course, indicate failure
        if (!courseDetails.modules[0].module_code) {
            return { success: false, reason: 'No modules attached to the course.' };
        }

        // Return the structured course details
        return courseDetails;
    } catch (err) {
        console.error('Error fetching course details:', err);
        return { success: false, reason: 'Internal server error.' };
    }
}

module.exports = {courseDetails}

