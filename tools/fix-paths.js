db.resumes.find({}).forEach(function(doc) {
  var parts = doc.filePath.replace(/\\/g, '/').split('/');
  var filename = parts[parts.length - 1];
  db.resumes.updateOne(
    { _id: doc._id },
    { $set: { filePath: '/app/uploads/resumes/' + filename } }
  );
  print('Updated: ' + filename);
});
