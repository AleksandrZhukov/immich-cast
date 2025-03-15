<script lang="ts">
  import axios from 'axios'
  import dayjs from 'dayjs'

  let {image} = $props();

  let resource = <T>(
    fn: () => Promise<T>,
    initialValue?: T
  ) => {

    const _rune = $state<{ value: T | undefined }>({
      value: initialValue
    });

    $effect(() => {
      fn().then((data) => {
        _rune.value = data;
      });
    });

    return _rune;
  };

  const info = resource(() => axios.get(`/api/images/${image}/info`).then((res) => res.data));

  $effect(() => {
    // This is being logged properly when the license keys are changed
    console.log('License keys changed:', info.value);
  });
</script>

<div class="picture">

  <img src={`/api/images/${image}`} alt="sdf" >
    <div class="location">
      {`${info.value?.location?.display_name}, ${dayjs(info.value?.fileCreatedAt).format('YYYY-MM-DD')}`}
    </div>
</div>
