(async function(){
  console.log('Running integration tests...')
  try{
    const modProps = await import('./test_properties.js')
    await modProps.default()
    const modSearch = await import('./test_search.js')
    await modSearch.default()
    console.log('\nALL TESTS OK')
    process.exit(0)
  }catch(err){
    console.error('\nTESTS FAILED', err)
    process.exit(1)
  }
})()
